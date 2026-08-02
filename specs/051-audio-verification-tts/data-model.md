# Data Model: Audio Verification & TTS Management

**No new tables, no new columns, no new migration.** This epic works entirely within the existing
schema. The one schema-adjacent fact that matters is already in place:
`server/migrations/059_explanation_cache_locale.sql` (verified, pasted in `research.md` R4) already
made `explanation_cache`'s primary key `(position_hash, locale)` — FR-016's fix is a query-shape
correction against that existing key, not a schema change.

## Entities (conceptual, per spec's "Key Entities" — none are new DB tables)

### Lesson message (existing concept, unchanged shape)

Produced by `collectMessages(lesson)` (`connect-four/server/lessonAudio.js:80`, unchanged this
epic). Each entry:

```js
{
  message: object,      // reference into lesson.slides[i].coachMessages[j], lesson.slides[i] (for infoProse), or lesson.socratic.messages[phase][j]
  locator: string,       // e.g. "slides[2].coachMessages[0]", "slides[2].infoProse", "socratic.messages.ask[0]"
  textKey: 'text' | 'infoProse',
  audioKey: 'audio' | 'infoProseAudio',
}
```
English/Spanish fields are siblings on `message`: `message[textKey]` / `message[textKey + '_es']`,
`message[audioKey]` / `message[audioKey + '_es']`. This epic adds **no new fields** to the lesson
JSON schema — FR-008/009/010/011 are a read/write **surface** over this existing shape, not a schema
change. The one new thing riding on top of it is a **derived, request-scoped** projection (see
"Lesson audio status" below), which is explicitly NOT persisted (FR-009).

### Lesson audio status (new, but derived-only — not a stored entity)

Computed by the new `GET /api/admin/lessons/:id/audio-status?lang=` endpoint (see
`contracts/admin-lesson-audio-endpoints.md`) on every request, from `getLessonsAll()` +
`collectMessages()` + an `fs.existsSync` check. Shape (per-request response, never written to disk
or DB):

```ts
{
  lessonId: string,
  lang: 'en' | 'es',
  groups: Array<{
    label: string,          // e.g. "Slide 3", "Socratic"
    messages: Array<{
      locator: string,      // stable id for FR-011's per-message regenerate target
      text: string,         // message[textKey] or message[textKey + '_es'], '' if none
      audioPath: string | null,  // message[audioKey] or its _es sibling, null if unset
      hasAudio: boolean,     // audioPath is non-empty AND fs.existsSync(publicDir + audioPath)
    }>
  }>
}
```

This is intentionally **not** a new registry (FR-009, and the epic's "Lesson audio stays
registry-free" hard constraint) — every field here is recomputed on every GET from the same sources
`collectMessages()`/`generateLessonAudio()`/`collectReferencedAudio()` already read. Nothing new is
written to `lessons/*.json` or any DB table to support this endpoint.

### Coach clip (existing concept, unchanged shape)

`server/tts-registry.json` / `tts-registry.es.json` entries — unchanged shape this epic
(`{key, slug, status, reason, generated_at, approved_at}` per
`docs/architecture/coach-audio-conventions.md`). FR-015 changes **when** the admin UI asks for
confirmation before calling the existing `POST /api/admin/audio/generate` endpoint; it does not
change the registry schema or the endpoint's response shape.

### Voice configuration (existing concept, resolution path changes — not the stored shape)

`server/tts-prompt.<lang>.json` (`{prompt, speed, voice, model}`, read via
`readTtsConfig(lang)` in `server/ttsConfig.mjs`) is **unchanged in shape**. What changes (FR-026) is
*where* it gets resolved: today five of six callers each independently call
`readTtsConfig(lang)` + `buildTtsInstructions(prompt, lang)` themselves before calling `synthesize`;
after this epic, that resolution happens **once**, inside the new `synthesize(text, lang)` /
`synthesizeStream(text, lang)` functions in `ttsProvider.js` — see `research.md` R1/R2 and
`contracts/tts-provider-contract.md`. `VALID_TTS_MODELS` (`ttsConfig.mjs:27`) shrinks from 3 entries
to 1 (`['gpt-4o-mini-tts']`) — this is a value change to an existing exported constant, not a schema
change.

### Open-issue entry (existing concept, `docs/open_issues.md` — not a DB table)

No schema. FR-030 requires editing that markdown file's entries for OI-42, OI-45, OI-26, OI-23,
OI-28, OI-32, OI-78, OI-65, OI-9, OI-43, OI-64 per the closeout convention already documented at the
top of that file (not repeated here — read it directly when doing the closeout task, since its exact
wording is the authority, not this plan's summary of it).

## Explicitly NOT changed

- `explanation_cache` table shape (columns, PK) — migration 059 already did the only schema change
  this epic's fixes depend on (FR-016). No new migration.
- Lesson JSON schema (`lessons/lesson-NN-slug.json`) — FR-008–012 add a read/write **surface**, not
  new fields.
- `tts-registry.json` / `tts-registry.es.json` / manifest shapes — FR-015/022/023 operate through the
  existing endpoints and existing shapes.
- `server/tts-prompt.<lang>.json` shape — FR-026/027 change *who resolves it*, not its fields.
