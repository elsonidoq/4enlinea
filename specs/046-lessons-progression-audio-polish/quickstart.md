# Quickstart: Verifying Epic 6

## Prerequisites

- `cd connect-four && npm run dev` (frontend) and the server dev process running (per project's standard
  local dev setup — see `docs/architecture/` if unfamiliar).
- A test learner: either an anonymous IndexedDB profile or a signed-in free-tier Supabase user (server
  running with `NODE_ENV` unset/`development`, so `requireAdmin` is a no-op).

## US1/US2 — Order-based lesson unlocking

1. Fresh profile (no `lesson_progress` rows): open `/saga` (Lessons). Only lesson 1 ("Immediate Threats")
   should show `current` styling; every other lesson shows `locked`.
2. Tap lesson 2 (order-locked, free): expect an order-lock message, NOT the upgrade modal.
3. Complete lesson 1 (play through to `saveLessonProgress(lessonId, 'complete')`). Reload `/saga`: lesson 2
   is now `current`; lesson 3 remains `locked`.
4. Continue through the renumbered free block (orders 1–8, ending at `opening-imitate`) — confirm no free
   lesson is ever blocked behind an incomplete paid lesson (SC-001/SC-002/Acceptance Scenario 6).
5. As a free-tier learner reaching order 9 (`undercut`, paid): tap it — expect the **upgrade modal**
   (tier-locked takes precedence per FR-003, even though order also happens to be satisfied here since 1–8
   are done).

## US3/US4 — Lesson audio

1. In dev (localhost), open `/admin/lessons`, edit a lesson, trigger "Generate audios."
2. Confirm each concept-slide `coachMessage.text` gets a populated `audio` path; confirm the file exists
   under `public/audio/lessons/`.
3. Edit one message's text, regenerate: confirm a *new* hash/file is produced and the old file becomes an
   orphan candidate (verify via the prune endpoint's dry response, without necessarily deleting it yet).
4. Open the corresponding lesson as a learner (`/saga` → tap it → concept slide): confirm each coach
   message narrates in order, one at a time, and a replay control is present.
5. Open a lesson (or slide) with no generated audio: confirm it still displays normally, no error, no
   playback attempt.
6. Toggle the global speech-off setting: confirm lesson audio does not play.
7. Navigate away mid-narration: confirm playback stops (no orphaned audio on the next screen).

## US5 — Board flicker

1. On a Socratic slide with an active narration in progress (US3 audio present), tap a column.
2. Visually and via the FR-024 regression check (whatever mechanism tasks.md lands on, e.g. a
   `data-disc-key` snapshot diff) confirm existing discs do not flicker/re-render — only the new disc
   appears.
3. Repeat 10 times per SC-007's manual corroboration step.

## FR-028 — Admin lockdown

1. From a non-localhost-simulated request (e.g. curl with a spoofed `X-Forwarded-For`, or by testing against
   a deployed non-prod-gated environment) confirm all 6 previously-open admin routes now 403.
2. In a browser, spoof a non-localhost `hostname` (e.g. via a local hosts-file alias pointing a non-loopback
   name at 127.0.0.1, or simply test the pure `isLocalhostOrigin` unit test) and confirm `/admin/*` renders
   the blocked page, not the admin UI.

## Automated tests

```
cd connect-four && npm run test:fast
```
New unit tests: `deriveLockReason`, `hashMessageText`/`generateLessonAudio`/`pruneOrphanedLessonAudio` (stub
`synthesize`), `isLocalhostOrigin`. None require the c4solver or a live OpenAI key.
