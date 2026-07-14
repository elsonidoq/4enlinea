# Data Model: Lessons — Progression, Audio & Polish (Epic 6)

No database schema changes. All entities below are either existing (unchanged shape except the additive
`audio` field) or client-side-only/derived (never persisted).

## Lesson (existing — `connect-four/lessons/*.json`, loaded by `lessonLoader.js`)

Unchanged top-level shape (`id`, `title`, `free`, `userPerspective`, `order` [derived from filename],
`slides[]`, `socratic`, `confirmationCategory`, `confirmationCount`, `confirmationChallenges`). This feature
does not add or remove any top-level field.

**Renumbering**: `order` is still derived purely from the `lesson-NN-*.json` filename prefix
(`lessonLoader.js:145-148`, unchanged mechanism). This feature renames 5 on-disk files per the spec's
renumbering table so the derived `order` values become: free block `1–8`, paid tail `9–13` (see spec.md
"Lesson renumbering" for the exact old→new filename mapping — reproduced verbatim there, not re-derived
here).

## Slide (existing, nested under `Lesson.slides[]`)

Unchanged: `{ movestring, coachMessages: CoachMessage[], boardSpec, overlays, legendItems, infoProse }`.

## CoachMessage (existing, extended)

```ts
{
  text: string,
  lead?: string,
  faded?: boolean,
  mood?: string,
  audio?: string | null,   // NEW — additive, optional
}
```

- `audio`: relative path to a pre-generated MP3, e.g. `/audio/lessons/<hash>.mp3` (served statically, same
  convention as `/audio/coach/<slug>.mp3`). `null`/absent when no narration has been generated for this
  message's *current* text.
- **Identity rule (FR-011)**: `audio`'s basename is `sha256(text).slice(0, 16) + '.mp3'`. A message's
  `audio` field is considered *stale* (must be regenerated) whenever its basename does not match
  `hashMessageText(text) + '.mp3'` — this is how "same text → same file, changed text → new file" is
  detected without a manifest (per Assumptions: no manifest/registry).
- Applies **only** to `coachMessages[]` on *concept* slides (`Lesson.slides[]`). `Lesson.socratic` has no
  `coachMessages[]` field today and gains none from this feature (verified against all 13 lesson files,
  Assumptions section) — Socratic prompts stay i18n-key-driven (`socratic.ask` etc. in `en.json`).

## LessonProgress (existing, unchanged — `SupabaseStore.js` / `IndexedDBStore.js`)

`{ lessonId: string, status: 'complete' }`. Read via the existing `getLessonProgress()`. This feature reads
it (to compute the order gate) but writes nothing new to it — `saveLessonProgress` call sites
(`ConceptScreen.jsx`, `SocraticScreen.jsx`, `ChallengeScreen.jsx`) are untouched (FR-026).

## NodeState (existing enum, unchanged values)

`'done' | 'current' | 'unlocked' | 'locked'` — returned by `SagaScreen.deriveNodeState`. The *derivation*
gains the order condition (OR'd with the tier condition per FR-002); the enum's value set is unchanged.

## LockReason (NEW — client-side-only, never persisted, never returned by any API)

```ts
type LockReason = 'none' | 'tier' | 'order' | 'both';
```

Computed by a new pure function `deriveLockReason(lesson, lessons, progress, tier)` in `SagaScreen.jsx`:

```
tierLocked  = lesson.free === false && tier !== 'paid'
orderLocked = predecessor(lesson, lessons) exists
              && !progress.some(p => p.lessonId === predecessor.id && p.status === 'complete')
reason = tierLocked && orderLocked ? 'both'
       : tierLocked                ? 'tier'
       : orderLocked               ? 'order'
       : 'none'
```

`predecessor(lesson, lessons)` = the lesson with the next-lower `order` value in the full sorted list;
`null` for the lowest-`order` lesson (never order-locked, per Edge Cases).

Consumed only by `handleNodeTap` (FR-003/FR-004/FR-005 dispatch: `tier`/`both` → `setUpgradeOpen(true)`;
`order` → order-lock message; `none` → normal navigation). `deriveNodeState`'s locked/unlocked/current/done
output is unaffected by which *reason* produced `locked` (FR-007 — resting visual may be identical).

## Static assets — `public/audio/lessons/`

Committed static files (`.mp3`), filename = `<sha256(text).slice(0,16)>.mp3`. No manifest/registry file
(Assumptions — explicitly rejected, unlike spec-039's `tts-registry.json`/`coach-audio-manifest.json`). The
lesson JSON's own `coachMessages[].audio` field is the sole source of truth for existence + location
(FR-013). Orphaned files (no lesson references them) are identifiable via a set-difference scan
(`pruneOrphanedLessonAudio`, FR-014) but are not required to be pruned before ship (Assumptions — pruning may
be deferred to a follow-up maintenance task).
