# Contract: Admin lesson-audio endpoints (FR-008–FR-012)

Covers the server support the new `/admin/audio` "Lessons" section (FR-008) needs. See `research.md`
R8 for reasoning.

## NEW: `GET /api/admin/lessons/:id/audio-status?lang=en|es`

Gate: `requireLocalhost, requireAdmin` — matching the verbatim two-middleware declaration used by
every sibling `/api/admin/lessons/*` route in `connect-four/server/index.js:870-948`, e.g.
`app.get('/api/admin/lessons/:id', requireLocalhost, requireAdmin, (req, res) => { ... })`. This
route is **not** "identical" to its siblings by virtue of `requireAdmin` alone — `requireAdmin` is a
documented no-op outside `NODE_ENV=production` (memory `project_admin_localhost_directive`);
`requireLocalhost` is the gate that actually restricts access in dev and staging. Declaring only
`requireAdmin` here would leave the endpoint effectively open in every non-production environment,
exposing full lesson content and on-disk audio paths. Use both, in that order, exactly as every
sibling route does.

**Request**: `lang` query param, `'en'` (default) or `'es'`. Invalid value → 400
`{ error: 'lang must be en or es' }`.

**Response 200**:
```json
{
  "lessonId": "lesson-03-threat-vocabulary",
  "lang": "en",
  "groups": [
    {
      "label": "Slide 1",
      "messages": [
        { "locator": "slides[0].coachMessages[0]", "text": "...", "audioPath": "/audio/lessons/abc123.mp3", "hasAudio": true },
        { "locator": "slides[0].infoProse", "text": "...", "audioPath": null, "hasAudio": false }
      ]
    },
    {
      "label": "Socratic",
      "messages": [
        { "locator": "socratic.messages.ask[0]", "text": "...", "audioPath": "/audio/lessons/def456.mp3", "hasAudio": true }
      ]
    }
  ]
}
```

**404** if no lesson with that `id` exists (`getLessonsAll().find(l => l.id === id)` returns
undefined) — same shape as the existing `GET /api/admin/lessons/:id` 404
(`{ error: 'not_found' }`).

**Implementation**: pure read, no writes. The handler MUST call `reloadLessons()` (or otherwise read
the lesson JSON fresh from disk) before walking the lesson, so status reflects a disk edit made after
server boot without requiring a restart — `getLessonsAll()`'s in-memory array (`connect-four/server/
lessonLoader.js:398`) is populated once at boot and is otherwise refreshed only by the explicit
`reloadLessons()` calls on the write routes, none of which run on a read path. This is the mechanism
FR-009's "computed live ... every time it is displayed" and OI-43 require. After the reload,
`getLessonsAll()` (raw, `_es` intact) → `collectMessages(lesson)` (unchanged, existing function) → for
each entry, resolve the localized `text`/`audioPath` fields the same way `generateLessonAudio` already
does (`localized(key) => lang === 'es' ? \`${key}_es\` : key`) and check `hasAudio` via
`fs.existsSync(path.join(PUBLIC_DIR, audioPath))` when `audioPath` is non-empty. Group by locator
prefix: `slides[N]...` → `"Slide ${N+1}"`, `socratic.messages...` → `"Socratic"`.

**Edge cases** (from spec's Edge Cases section, re-verified against this endpoint):
- Lesson with `socratic: null` → simply no `"Socratic"` group in the response (not an error).
- Message with empty/whitespace text → excluded from the response entirely (matches
  `generateLessonAudio`'s existing "nothing to say" skip, so the admin UI never shows a spurious
  "missing audio" row for a field that has no text to narrate).
- Two messages with identical text sharing one mp3 → both appear as separate entries with the same
  `audioPath` — this is correct, not a bug, and the UI must not deduplicate them.

## CHANGED: `POST /api/admin/lessons/:id/generate-audio`

Existing endpoint (per `docs/architecture/api-conventions.md:915` and
`specs/046-lessons-progression-audio-polish/contracts/lesson-audio-generation.md`). Adds one
**optional** body field:

```json
{ "lang": "es", "locator": "slides[0].coachMessages[0]" }
```

- `locator` **absent** (today's only mode): unchanged behavior — regenerates every message in the
  lesson for that language. This preserves `AdminLessonEditorScreen`'s existing "Generate audios"
  button, which must keep doing a full-lesson regeneration.
- `locator` **present**: only the single `collectMessages()` entry whose `locator` matches is
  (re)synthesized; every other message's `audio`/`audio_es` field is left untouched. **Settled**: if no
  entry matches (stale locator — e.g. lesson JSON edited between the admin page's last load and this
  click), respond `200 { "generated": [], "failed": [] }` — a no-op, not an error. This matches the
  endpoint's existing philosophy of never erroring on a mismatch (per lesson-editor.md's stale-cache
  guidance), and keeps the server (T015) and frontend (T016) built against the same shape. The
  frontend already refetches status after every generate action, so a vanished message simply
  disappears from the list on the next render — no special-case handling needed client-side.

**Implementation**: `generateLessonAudio(lesson, { lang, locator })` — `locator` filters the
`collectMessages(lesson)` iteration (`if (locator && entry.locator !== locator) continue;`) before
the existing per-entry try/catch synthesis loop. No other change to the function's body.

## UNCHANGED but consumed: `GET /api/admin/lessons` (list) and `GET /api/admin/lessons/:id`

The Lessons section's lesson picker/list uses the existing `GET /api/admin/lessons` (full lesson
objects) purely for the id/title list — no change needed there.

## Frontend consumption (`connect-four/src/pages/AdminAudioPage.jsx`)

Add a new top-level section (sibling to the existing coach-audio status list / config editor /
preview sandbox), respecting the page's existing `lang` state (FR-012 — reuse the same toggle, do
not add a second one). On lesson select, `fetch(`${API}/api/admin/lessons/${id}/audio-status?lang=${lang}`)`
and render `groups` with an inline `<audio>` player per message (mirroring the existing `AudioPlayer`
component at `AdminAudioPage.jsx:53`) and a "Generate" button per message that POSTs to
`generate-audio` with that message's `locator`. This section must not read or write any new
`localStorage` key or client-side cache — status is refetched from `audio-status` after every
generate action, matching FR-009's "live" requirement.
