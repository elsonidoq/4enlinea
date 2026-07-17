# Tasks: Lessons — Progression, Audio & Polish (Epic 6)

**Input**: Design documents from `specs/046-lessons-progression-audio-polish/` (spec.md, plan.md, research.md,
data-model.md, contracts/lesson-audio-generation.md, contracts/admin-localhost-guard.md, quickstart.md)
**Tests**: Included per Constitution Principle III (pure-function extraction + `node:test`, no TDD-gate
required by this repo's conventions) — see `docs/architecture/testing-conventions.md`.
**Test runner**: `npm run test:fast` inside `connect-four/` (CLAUDE.md convention — do NOT use plain `npm test`,
which invokes the slow solver-backed suite this feature does not need).
**Repo root for all relative paths below**: `connect-four/` unless a path starts with `specs/`, `docs/`, or
`staging_checks.md` (repo-root files).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US5 map to spec.md's five user stories; tasks with no story label are Setup/Foundational/
  cross-cutting/Polish.

---

## Phase 1: Setup

- [x] T001 Read the mandatory architecture docs before touching any code — `docs/architecture/api-conventions.md`,
  `docs/architecture/server-conventions.md`, `docs/architecture/frontend-conventions.md`,
  `docs/architecture/testing-conventions.md`, `docs/architecture/data-model.md`, `docs/architecture/db-schema.md`
  — and confirm the baseline is green: `cd connect-four && npm run test:fast`. No file changes in this task; it
  is a verification gate before Phase 2.

---

## Phase 2: Foundational

**No blocking cross-story tasks.** The five user stories touch disjoint code paths (SagaScreen order-gate,
ConceptScreen narration, a new `server/lessonAudio.js` + 2 admin routes, and the Board/Socratic flicker fix)
and share no new model, schema migration, or abstraction that must exist before any of them can start
(Constitution II — no premature shared abstraction). `CoachMessage.audio` (FR-009) is a plain additive JS
object field with no schema/type file to update in this JS-only codebase — it needs no dedicated foundational
task. Proceed directly to Phase 3.

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Lessons unlock in order (Priority: P1) 🎯 MVP

**Goal**: Renumber the lesson catalog so free lessons form one contiguous block ahead of the paid tail, and
layer an order-gate lock condition (OR'd with the existing tier gate) onto `SagaScreen.deriveNodeState`.

**Independent Test**: Load the Saga Map for a fresh learner (no lesson-progress records) and confirm only
lesson 1 (lowest `order`) is unlocked/current; mark lesson 1 complete via the existing progress store and
confirm lesson 2 becomes enterable while lesson 3 remains locked.

### Implementation for User Story 1

- [x] T002 [US1] Execute the 7-step collision-safe `git mv` rename sequence in `connect-four/lessons/`, in this
  exact order (plan.md "Lesson rename execution order" — using `git mv`, NOT `mv` + `git add`, so a collision
  fails loudly instead of silently overwriting):
  1. `git mv lesson-09-figure-7-trap.json lesson-11-figure-7-trap.json`
  2. `git mv lesson-07-undercut.json lesson-09-undercut.json`
  3. `git mv lesson-12-opening-centre.json lesson-07-opening-centre.json`
  4. `git mv lesson-10-j-shape.json lesson-12-j-shape.json`
  5. `git mv lesson-08-overcut.json lesson-10-overcut.json`
  6. `git mv lesson-13-opening-imitate.json lesson-08-opening-imitate.json`
  7. `git mv lesson-14-opening-sharp.json lesson-13-opening-sharp.json`
  Do not edit any JSON content (the stale `order: null` inside `lesson-06-z-threats.json` is left as-is, per
  spec.md). `lesson-01` through `lesson-06` are untouched.
- [x] T003 [US1] Mandatory post-rename empirical verification (CLAUDE.md empirical-first convention — do not
  skip by just re-reading filenames): start the local dev server, then `curl http://localhost:<port>/api/lessons`
  (or an equivalent `node -e` fetch script) and confirm the 13 returned lessons sort into orders 1–13 with no
  gaps/duplicates, and that every lesson with `free: true` occupies exactly orders 1–8 while every `free: false`
  lesson occupies exactly orders 9–13, matching spec.md's renumbering table exactly.
- [x] T004 [US1] In `src/screens/SagaScreen.jsx`, add a pure sibling helper next to `deriveNodeState`
  (currently `:170-190`):
  `deriveLockReason(lesson, lessons, progress, tier)` → `'none' | 'tier' | 'order' | 'both'`, per
  data-model.md's `LockReason` derivation:
  ```
  tierLocked  = lesson.free === false && tier !== 'paid'
  predecessor = the lesson with the next-lower order in lessons sorted by order (null if lesson is lowest-order)
  orderLocked = predecessor !== null && !progress.some(p => p.lessonId === predecessor.id && p.status === 'complete')
  reason = tierLocked && orderLocked ? 'both' : tierLocked ? 'tier' : orderLocked ? 'order' : 'none'
  ```
  Do NOT introduce a new hook/module (research.md R1 — single screen, single call site; Constitution II).
  `deriveLockReason` is NOT the sole tap authority: a lesson already marked `'done'` in `progress` must never
  be treated as locked by callers, regardless of what `deriveLockReason` would compute for it in isolation —
  see the mandatory short-circuit in T008 (Edge Case "Learner replays an already-completed lesson").
- [x] T005 [US1] Update `deriveNodeState` in `src/screens/SagaScreen.jsx` to call `deriveLockReason` and return
  `'locked'` whenever the reason is not `'none'` (FR-002: order gate OR'd with tier gate), replacing the current
  tier-only `isLocked` check at `:174`. Do not change the `'done' | 'current' | 'unlocked' | 'locked'` enum
  value set (FR-007) — only the derivation of `'locked'` changes. The `firstAccessible`/`'current'` computation
  at `:178-189` must use the same combined lock condition, not the old tier-only one.
- [x] T006 [P] [US1] Add `tests/unit/deriveLockReason.test.js` (fixture-based, no DOM) exercising
  `deriveLockReason` directly against a small fixture `lessons` array + `progress` array + `tier` string,
  covering: lowest-order lesson is never `'order'`-locked regardless of progress (Edge Cases); a lesson whose
  predecessor is incomplete → `'order'`; a `free:false` lesson with `tier !== 'paid'` → `'tier'`; a lesson that
  is both → `'both'`; a lesson with a complete predecessor and passing tier → `'none'`; completing lesson N
  unlocks exactly lesson N+1 and N+2 stays order-locked (SC-002).
- [x] T007 [US1] Run `npm run test:fast`; confirm green.

**Checkpoint**: A fresh learner sees exactly lesson 1 unlocked on the Saga Map; completing it unlocks lesson 2
only (SC-001/SC-002), independent of tap-response wiring (US2).

---

## Phase 4: User Story 2 — Correct prompt for each lock reason (Priority: P1)

**Goal**: Tapping a locked lesson shows the prompt that matches *why* it's locked — the upgrade modal for a
tier-locked lesson, a non-paywall order-lock message for an order-locked-only lesson, with tier winning when
both apply.

**Independent Test**: Tap a tier-locked lesson node and confirm the upgrade modal opens; tap an order-locked
free lesson node and confirm a non-paywall message appears with no upgrade modal.

**Depends on**: Phase 3 (`deriveLockReason` must already exist).

### Implementation for User Story 2

- [x] T008 [US2] Update `handleNodeTap` in `src/screens/SagaScreen.jsx` (currently `:192-199`) with a mandatory
  done-lesson short-circuit BEFORE consulting `deriveLockReason` (Edge Case "Learner replays an
  already-completed lesson" — a renumbered predecessor may be incomplete for a lesson the learner already
  finished under the old order, and `deriveLockReason` alone would incorrectly order-lock it): if the tapped
  lesson already has a `'complete'`/`done` progress record, immediately `go('concept', { lessonId: lesson.id })`
  and return — do not compute or branch on `deriveLockReason` at all for this case. Otherwise, compute
  `deriveLockReason(lesson, lessons, progress, tier)` once and branch (research.md R3):
  - `'tier'` or `'both'` → `setUpgradeOpen(true)` (unchanged existing wiring, FR-005).
  - `'order'` → set a new `orderLockMessage`/`orderLockOpen` state (do NOT open `UpgradeModal`) — FR-004.
  - `'none'` → `go('concept', { lessonId: lesson.id })` as today.
  This directly encodes FR-003's precedence rule (tier wins when both apply), with the done-lesson check taking
  precedence over both.
- [x] T009 [US2] Add the order-lock message UI in `src/screens/SagaScreen.jsx`: a lightweight inline
  banner/toast (NOT a modal — research.md R4), conditionally rendered on the new `orderLockMessage` state,
  dismiss-on-tap or auto-dismiss, styled with the screen's existing tokens (no new shared `<Toast>` component —
  Constitution II, no premature abstraction for a single use site).
- [x] T010 [US2] Add the order-lock copy as an i18n `t()` call with a distinct key, e.g.
  `t('saga.orderLock.message', 'Finish the previous lesson to unlock this one')`. Add a real
  `src/i18n/en.json` entry for `saga.orderLock.message` (value: "Finish the previous lesson to unlock this
  one") so the string is translatable (FR-025), keeping the inline `t(key, defaultValue)` call's default value
  as a safety net matching the existing pattern in this file — must not reference payment/upgrading; must be
  visibly distinct from the tier-lock/`UpgradeModal` copy (FR-006).
- [x] T011 [US2] Confirm (no code change expected) that `deriveNodeState`'s resting visual output for an
  order-locked node is unaffected by this phase — FR-007 explicitly allows the resting visual to stay
  identical between order-locked and tier-locked nodes; only the tap response differs.
- [x] T012 [P] [US2] Extend `tests/unit/deriveLockReason.test.js` (or add a sibling test file) asserting the
  *dispatch* mapping used by `handleNodeTap`: `'tier'` → upgrade path, `'both'` → upgrade path (tier wins),
  `'order'` → order-lock path (not upgrade), `'none'` → navigate path — testing the reason→action mapping as a
  small pure function extracted alongside `deriveLockReason` if `handleNodeTap`'s branching logic itself isn't
  directly unit-testable without a DOM harness (this repo has none — OI-7). ALSO add a case for the T008
  done-lesson short-circuit: a lesson with a `'complete'` progress record whose predecessor is INCOMPLETE →
  navigate path (never order-lock path), asserting the short-circuit takes priority over whatever
  `deriveLockReason` alone would return for that fixture (Edge Case "Learner replays an already-completed
  lesson").
- [x] T013 [US2] Manual acceptance walkthrough (no DOM/browser test harness in this repo, per OI-7): as a
  free-tier learner, tap a `free:false` lesson node → confirm `UpgradeModal` opens; tap an order-locked
  `free:true` lesson node → confirm the order-lock banner appears and `UpgradeModal` does NOT open; as a
  paid-tier learner, tap an order-locked (tier-eligible) lesson → confirm the order-lock message, never the
  upgrade modal (SC-003). Run `npm run test:fast`; confirm green.

**Checkpoint**: US1 + US2 together fully deliver FR-001–FR-008 (the epic's US6.1/US6.2). 100% of order-locked
taps show order-lock messaging with zero upgrade-modal opens; 100% of tier-locked taps open the upgrade modal
(SC-003).

---

## Phase 5: User Story 3 — Coach narration per lesson message (Priority: P2)

**Goal**: Each concept-slide `coachMessage` with generated audio narrates in order, one at a time; messages
without audio degrade gracefully with no error.

**Independent Test**: Open a lesson whose messages have generated audio and confirm each coach bubble plays
its own narration in order; open a lesson (or message) with no generated audio and confirm the slide still
displays and reads normally with no playback error.

**Independent of US1/US2**. Testable end-to-end once at least one `coachMessages[].audio` path exists (a
hand-placed test `.mp3` is sufficient — does not require US4's admin UI to exist first); the playback code
itself is unit-testable via the pure helper in T014 without any real audio file.

### Implementation for User Story 3

- [x] T014 [P] [US3] Add a pure exported helper `getNarrationQueue(coachMessages, speechEnabled)` (new file
  `src/lib/lessonNarration.js`, or exported from `src/lib/useCoachSpeech.js`) that returns `[]` when
  `speechEnabled` is `false` (FR-019 — the gating check must be assertable as pure logic, since
  `speakLessonAudio`/`speakDeepReveal` do NOT check the toggle internally per plan.md's "Lesson-audio playback
  gating" section); otherwise returns the ordered list of non-null, non-empty `coachMessages[].audio` values
  (FR-017 — messages with null/missing/whitespace-only `audio` are skipped; FR-016 — order preserved).
- [x] T015 [P] [US3] Add `tests/unit/lessonNarration.test.js` covering `getNarrationQueue`: `speechEnabled:
  false` → `[]` regardless of populated `audio` fields; messages with `audio: null`/missing/`''` are skipped;
  order of the returned queue matches the input `coachMessages[]` order.
- [x] T016 [US3] Add `speakLessonAudio(path)` export to `src/lib/useCoachSpeech.js` (research.md R7): a thin
  wrapper `speakDeepReveal(new Audio(path))` — literally the same singleton-queue mechanism
  `DeepRevealPane.jsx` already uses, giving "one at a time" (FR-016) for free with zero new synchronization
  code. Do NOT extend `speakCoachMessage(key)` (it is manifest-gated and would silently no-op every lesson
  message — research.md R7 "Alternatives considered").
- [x] T017 [US3] In `src/screens/ConceptScreen.jsx`, add a narration effect that runs on `slideIndex` change
  (and initial mount): read `speechEnabled` from `useAudio()`, call `getNarrationQueue(slide.coachMessages,
  speechEnabled)`, and call `speakLessonAudio(path)` for each path in the returned queue, in order. The effect
  MUST return a cleanup function that calls `stopSpeech()` (already exported from `useCoachSpeech.js`)
  unconditionally on unmount/slide-change/navigation (FR-021) — this is the caller's responsibility, not
  `speakLessonAudio`'s (plan.md "Lesson-audio playback gating").
- [x] T018 [P] [US3] Add an optional `onReplay` prop to `src/components/CoachDialog.jsx` — a small icon button,
  shown only when the current slide has at least one narratable message — that re-invokes the same
  `getNarrationQueue` → `speakLessonAudio` loop for the current slide (FR-018 replay control). Wire it from
  `ConceptScreen.jsx`.
- [x] T019 [US3] Confirm the existing global speech-enabled/mute toggle (`useAudio()`, already surfaced
  somewhere in the app shell) is sufficient for FR-018's mute requirement — narration already stops responding
  to new messages once `speechEnabled` is `false` via T017's gate; no new mute control needed unless one is
  found missing during manual verification (T021).
- [x] T020 [US3] Confirm (per Assumptions/FR-016 scope) that `src/screens/SocraticScreen.jsx` is NOT touched by
  this phase — Socratic prompts stay i18n-key-driven and out of scope; no `getNarrationQueue`/`speakLessonAudio`
  call is added there.
- [x] T021 [US3] Manual acceptance walkthrough (no DOM harness, OI-7): hand-place a test `.mp3` at
  `public/audio/lessons/` and point one lesson's `coachMessages[0].audio` at it (temporary, revert before
  commit unless it's real generated content); open that lesson's concept slide and confirm sequential,
  non-overlapping narration; confirm a slide with `audio: null` on every message displays normally with no
  playback attempt and no error (FR-017/SC-005); confirm replay and mute controls work; confirm navigating
  away stops playback. Run `npm run test:fast`; confirm green.

**Checkpoint**: Every coach message with generated audio narrates automatically, in order, no overlap (SC-004);
a lesson with zero/partial audio remains fully readable with no playback errors (SC-005).

---

## Phase 6: User Story 4 — Admin generates lesson audio (Priority: P2)

**Goal**: An admin editing a lesson can trigger "generate audios" and have every concept-slide coach message's
narration synthesized, saved, and immediately playable — with no separate publish/approval step.

**Independent Test**: In the lesson editor, trigger "generate audios" for a lesson and confirm each coach
message's `audio` path is populated and the audio file exists and plays back.

**Independent of US1–US3** (server-side + admin-editor work only; US3 consumes its output but does not require
it to exist first, per Phase 5's note).

### Implementation for User Story 4

- [x] T022 [P] [US4] Create `server/lessonAudio.js` (pure-function module, mirrors `server/insertGameBlunder.js`
  per `docs/architecture/testing-conventions.md`'s Pure Function Extraction Pattern), exporting:
  - `hashMessageText(text)` → `crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)`.
  - `generateLessonAudio(lesson, { synthesize = ttsSynthesize } = {})` → async; iterates every *concept*
    slide's `coachMessages[]` only (never `lesson.socratic` — FR-010); skips empty/whitespace-only `text`
    (Edge Cases); skips messages whose current `audio` basename already equals `hashMessageText(text) +
    '.mp3'` (no redundant re-synthesis — FR-011); for the rest, calls `synthesize(text)`
    (`server/ttsProvider.js`), writes `public/audio/lessons/<hash>.mp3`, sets
    `coachMessages[i].audio = '/audio/lessons/<hash>.mp3'`; wraps each message's synthesis in its own
    try/catch so one failure leaves that message's `audio` unset/unchanged and does not abort the batch
    (FR-015); returns `{ lesson: <updated lesson>, generated: [...locators], failed: [{ locator, error }] }`.
  - `pruneOrphanedLessonAudio(allLessons)` → scans `public/audio/lessons/*.mp3`, computes the set of `audio`
    paths referenced by any lesson/slide/message across `allLessons`, deletes files not in that set, returns
    the list of deleted filenames (FR-014).
- [x] T023 [P] [US4] Add `tests/unit/lessonAudio.test.js` using a stub `synthesize` (no real OpenAI call, per
  `insertGameBlunder.test.js`'s stub-object pattern): `hashMessageText` is stable for identical text and
  differs for different text; `generateLessonAudio` skips a message whose `audio` already matches the current
  text's hash (no re-synthesis call to the stub); a message with a stale hash (changed text) gets a new
  `audio` path; a stub `synthesize` that throws for one message does not stop the batch and leaves that
  message's `audio` unset while others still complete (FR-015); empty/whitespace-only `text` is skipped with
  no `synthesize` call; `lesson.socratic` is never touched even if it has message-like fields;
  `pruneOrphanedLessonAudio` returns exactly the files not referenced by any lesson's `coachMessages[].audio`.
- [x] T024 [US4] Register `POST /api/admin/lessons/:id/generate-audio` in `server/index.js` (near the existing
  lesson-admin routes at `:749-796`), guarded `requireLocalhost, requireAdmin` (FR-012a): loads the lesson via
  the existing `getLesson(id)` (server-side read — do NOT trust a client-supplied lesson body, to avoid
  persisting a stale buffer over a concurrent edit, per plan.md's coordination-contract note); 404s
  `{ error: 'not_found' }` if the lesson doesn't exist; calls `generateLessonAudio(lesson)`; persists via the
  existing `saveLessonFile(LESSONS_DIR, lesson)` (same mechanism `PUT /api/admin/lessons/:id` already uses);
  calls `reloadLessons()`; responds `200` with `{ lesson, generated, failed }` per
  `contracts/lesson-audio-generation.md` — `lesson` MUST be the full updated lesson object (not a partial
  patch), since the admin-editor client will `setLesson()` directly from this response (T027).
- [x] T025 [P] [US4] Register `POST /api/admin/lessons/prune-audio` in `server/index.js`, guarded identically
  (`requireLocalhost, requireAdmin`): runs `pruneOrphanedLessonAudio(getLessonsAll())`, responds `200` with
  `{ deleted: string[] }` (empty array if nothing orphaned).
- [x] T026 [US4] Create the `public/audio/lessons/` directory as the committed static-asset target (empty
  `.gitkeep` or first real generated file) and confirm (no code change expected — research.md R8) that the
  existing static-file middleware serving `public/audio/coach/*.mp3` already covers this new subdirectory with
  no per-directory allowlist to extend.
- [x] T027 [US4] Add a "Generate audios" button + handler in `src/screens/AdminLessonEditorScreen.jsx`
  implementing the **mandatory** save-first → generate → rehydrate coordination contract (plan.md "Admin
  editor / audio-generation coordination contract" — a data-loss race exists otherwise):
  1. Call the existing `handleSave()` (`:117-137`) and `await` it; if it errors, surface the save error and
     do NOT proceed to step 2.
  2. `POST /api/admin/lessons/:id/generate-audio` (no body — server reads from disk per T024).
  3. Take the `lesson` object from the `200` response and `setLesson(hydrated)` using the same hydration
     shape the initial-load `useEffect` already performs (`:92-114`), so the editor buffer and disk are back
     in sync with respect to the newly-populated `audio` paths.
  Show a loading/progress state while generation runs (batch synthesis is not instant) and surface `failed`
  entries from the response (FR-015 — non-fatal, but the admin should see which messages didn't get audio).
- [x] T028 [US4] Add a "Prune orphaned audio" maintenance action reachable from the admin lesson UI (e.g. a
  button in `src/screens/AdminLessonListScreen.jsx` or the editor screen) calling
  `POST /api/admin/lessons/prune-audio` and showing the `deleted` list (FR-014 — may run as a separate action
  from generation, per spec Assumptions; not required to be bundled into every "Generate audios" click).
- [x] T029 [US4] Confirm (no code change expected) that regeneration is text-driven end-to-end: editing a
  message's text in the editor and clicking "Generate audios" again produces a *new* file distinct from the
  old one (FR-011) — verified via T023's unit tests plus the manual check in T030.
- [x] T030 [US4] Manual verification in local dev (localhost-only, real `OPENAI_API_KEY` required): trigger
  "Generate audios" for a real lesson; confirm `coachMessages[].audio` paths populate in the saved JSON,
  the corresponding MP3s exist under `public/audio/lessons/` and play; edit one message's text and regenerate,
  confirm a new hash/file appears and the previous file is identifiable as orphaned by "Prune orphaned audio";
  confirm reloading the lesson in the editor and opening it as a learner both resolve the saved paths with no
  extra admin action (Acceptance Scenario 3).
- [x] T031 [US4] Run `npm run test:fast`; confirm green.

**Checkpoint**: An admin can generate narration for an entire lesson's coach messages in one action without
hand-editing JSON (SC-006); regeneration is idempotent for unchanged text and produces new audio for changed
text; failures are isolated per-message.

---

## Phase 7: User Story 5 — No board flicker while the coach speaks (Priority: P2)

**Goal**: Tapping an interactive board column while the coach is narrating must not visibly flicker/reset
already-placed discs.

**Independent Test**: On the Socratic screen with narration playing, tap a column and observe the board —
discs already on the board must not blink, disappear, or redraw during the tap.

**Sequencing is mandatory** (Constitution VI — reproduce before theorizing; plan.md's Constitution Check
explicitly forbids skipping to a guessed patch): reproduce → instrument → identify → minimal fix →
regression-proof, in that order. Do NOT combine or reorder these steps.

### Implementation for User Story 5

- [x] T032 [US5] REPRODUCE: with the app running locally, get the coach actively narrating on
  `SocraticScreen.jsx` or `ConceptScreen.jsx` (using existing `speakCoachMessage`/the new `speakLessonAudio`
  from Phase 5, or by manually starting an `Audio` element to simulate an active-narration state), tap an
  interactive board column, and visually confirm the reported flicker/flash/reset of already-placed discs.
  Document the exact repro steps (lesson, slide/phase, timing) — this is required evidence, not optional.
- [x] T033 [US5] INSTRUMENT: using React DevTools Profiler's "why did this render" (or manual
  console/key-identity logging added temporarily to `src/components/Board.jsx`), capture what actually
  re-renders during the reproduced tap-during-narration interaction — specifically whether `Board`'s existing
  41-or-fewer already-placed-disc cells are treated as new/changed DOM nodes, and by what parent state change.
  Grounding for what to look for: the reported symptom is that while the coach is narrating (TTS
  speaking/`CoachDialog` speaking state active), clicking to drop a disc visibly flickers the board — a brief
  re-mount/reflow of already-placed discs — instead of the disc placing smoothly; candidate mechanisms to rule
  in/out are (a) a full `Board` re-mount, (b) prop churn from `CoachDialog`/coach-state flowing into `Board`'s
  parent and cascading a re-render, or (c) a third, as-yet-unidentified cause — do not assume it is (a) or (b)
  before the instrumentation shows which.
- [x] T034 [US5] IDENTIFY the root cause mechanism from T033's evidence alone (Constitution VI — no
  theorizing before instrumentation). research.md R10 narrows the search space (Board's per-cell keys are
  stable across `board[row][col]` array recreation, pointing away from a key-remount theory and toward a
  conditional-render swap or coach-state-triggered parent re-render) but does NOT pre-determine the answer —
  confirm or refute against the actual T033 evidence. Record the identified mechanism explicitly (one of:
  full re-mount / prop churn causing parent re-render / other) — T036/T037 are conditioned on this record and
  must NOT be started, nor pre-committed to a board-signature theory, before this task names the mechanism.
- [x] T035 [US5] Apply the minimal fix at the site identified in T034 (e.g. memoizing `Board`, isolating
  `CoachDialog`/coach-state updates from `Board`'s parent re-render chain in `ConceptScreen.jsx` or
  `SocraticScreen.jsx`) — touch only the file(s) T034's evidence points to; do not pre-emptively touch
  `Board.jsx`/`SocraticScreen.jsx`/`ConceptScreen.jsx` beyond what the identified mechanism requires.
- [x] T036 [P] [US5] **Depends on T034's recorded mechanism — do not design this helper before T034 completes.**
  If (and only if) T034 identifies a mechanism where a stable per-cell identity/value snapshot is the right
  regression surface (e.g. the fix relies on memoization keyed off board content, or the bug was a
  key/identity churn), extract a small pure helper (e.g. `deriveBoardSignature(board)` in `src/lib/board.js`
  or alongside the fix site) producing that stable snapshot — e.g. a string or array keyed by `(row, col,
  value)` for every currently-placed disc. If T034 instead identifies a different mechanism (e.g. a
  remount/mount-count signal, a render-count signal, or something else), extract whatever minimal pure/testable
  signal actually characterizes *that* mechanism instead — `deriveBoardSignature` is one candidate shape, not
  a mandate.
- [x] T037 [P] [US5] Add a `node:test` regression test in `tests/unit/` targeting the signal T036 produced
  (board-signature or whatever T034's mechanism actually calls for), asserting it is unchanged/stable across a
  simulated coach-speech state transition matching the reproduced scenario from T032 (e.g. board state
  before/after a tap-during-narration sequence). Mandatory red-then-green: first confirm this test FAILS
  against the pre-fix code (temporarily revert/stash T035's fix, or check out the pre-fix commit, and show the
  test catches the flicker mechanism), THEN confirm it PASSES with T035's fix applied — record both results.
  A test that only ever runs green (never shown to fail against the un-fixed code) does not satisfy this task,
  since it could be passing vacuously. Satisfies FR-024/SC-007 without introducing a new DOM/browser
  test-infra dependency (this repo has none — tracked as OI-7 in `docs/open_issues.md`, independent of this
  feature).
- [x] T038 [US5] Manual corroborating pass (non-blocking, per SC-007 — evidence, not the primary bar): tap a
  column during active narration across at least 10 consecutive reproductions of the original trigger from
  T032; confirm no visible flicker in any repetition.
- [x] T039 [US5] Confirm no other board-rendering behavior regressed (e.g. the legitimate new-disc-placement
  animation/highlight from a tap still renders correctly) — quick manual smoke pass alongside T038.
- [x] T040 [US5] Run `npm run test:fast`; confirm green.

**Checkpoint**: Board flicker while narration plays is eliminated and backed by a non-subjective, programmatic
regression check (SC-007), plus corroborating manual evidence.

---

## Phase 8: `/admin` Localhost Lockdown (FR-028, cross-cutting owner directive)

**Not one of the 5 numbered user stories** — a blanket security-hardening requirement spanning `/admin`
surfaces this epic did not all originate. Independent of Phases 3–7; may run in parallel with them, but its
two pre-flight checks below are a **hard gate**: do not proceed to the implementation tasks in this phase
until both pre-flight checks are resolved.

- [x] T041 PRE-FLIGHT GATE (manual, blocking — do not skip): confirm no staging/QA workflow currently depends
  on reaching any existing `/admin/*` page or `/api/admin/*` route from a non-localhost origin (e.g. a remote
  staging box's admin UI accessed by IP/domain rather than an SSH-tunnel-to-localhost). Check the `app-qa`
  skill's setup notes and memory `project_app_qa_setup_gotchas.md` for any remote/non-localhost admin usage.
  **If a real dependency is found, STOP** — surface it as a blocker to the owner rather than shipping the
  lockdown silently over it (spec's explicit "no exceptions" requirement makes a silent carve-out
  unacceptable). Only proceed to T042+ once this is cleared.
- [x] T042 PRE-FLIGHT GATE (manual): confirm `NODE_ENV=production` is reliably set in the actually-deployed
  Railway environment (`requireAdmin` in `server/adminAuth.js` is a no-op outside `NODE_ENV=production`, so
  the API-side gap this phase closes is only a real production exposure if `NODE_ENV` is in fact `production`
  there today). Inspect the Railway env/deploy config (see memory `project_spec031_staging_production_deploy.md`
  for prior deploy-config traps). If `NODE_ENV` is not reliably set, note the reduced urgency of the API-side
  fix in this phase's implementation notes but still proceed with the frontend guard (T047–T049), which has no
  `NODE_ENV` dependency.
- [x] T043 [P] Add `requireLocalhost` as the first middleware argument on the 5 currently-ungated lesson-admin
  routes in `server/index.js`: `GET /api/admin/lessons` (`:749`), `GET /api/admin/lessons/:id` (`:754`),
  `POST /api/admin/lessons` (`:761`), `PUT /api/admin/lessons/:id` (`:772`), `DELETE /api/admin/lessons/:id`
  (`:783`) — one-line insertion per route (`app.<verb>('<path>', requireLocalhost, requireAdmin, ...)`), no
  other handler-body change.
- [x] T044 [P] Add `requireLocalhost` to `GET /api/admin/puzzles` (`server/index.js:802`), same one-line
  pattern.
- [x] T045 **HARD DEPENDENCY: requires T024 and T025 (Phase 6) already merged** — do not start this task
  before both exist; if Phase 8 is being run before Phase 6, stop and complete T024/T025 first. Confirm (no
  code change expected) that the two new lesson-audio routes from Phase 6 (T024, T025) already carry
  `requireLocalhost` from creation — grep-verify only. Running this task before T024/T025 exist would make its
  "already gated" assertion vacuous/false-complete.
- [x] T046 **HARD DEPENDENCY: requires T024 and T025 (Phase 6) already merged**, same reason as T045 — the
  full-coverage grep below only proves complete API-side coverage if the two lesson-audio routes are already
  present in `server/index.js` to be matched. Grep-verify full API-side coverage:
  `grep -n "app\.\(get\|post\|put\|delete\)('/api/admin" server/index.js` — every matched line must show
  `requireLocalhost` in its handler-argument list. Record the grep output as evidence this task is done.
- [x] T047 [P] Create `src/lib/isLocalhostOrigin.js` exporting
  `isLocalhostOrigin(hostname = window.location.hostname)` → `true` iff `hostname` is `'localhost'`,
  `'127.0.0.1'`, or `'::1'`.
- [x] T048 [P] Add `tests/unit/isLocalhostOrigin.test.js` with explicit `hostname` arguments covering:
  `'localhost'` → true, `'127.0.0.1'` → true, `'::1'` → true, a real domain (e.g. `'app.example.com'`) →
  false, an empty string → false.
- [x] T049 Create `src/pages/AdminBlockedPage.jsx` — minimal, no data fetch, no lazy admin-bundle import (must
  render even when nothing else does), a static "This page is only available from localhost" message.
- [x] T050 Restructure the admin routing block in `src/App.jsx` (`:114-133`, currently 5 independent
  `if (pathname.startsWith('/admin/...'))` branches with no guard) into one outer guard:
  ```js
  if (window.location.pathname.startsWith('/admin')) {
    if (!isLocalhostOrigin()) return <AdminBlockedPage />;
    // existing 5 sub-branches unchanged (audio, lessons, deep-reveal-eval, fv-suff, bare /admin fallback)
  }
  ```
  The non-localhost path must render `AdminBlockedPage` without triggering any `lazy()` admin-page import
  (defense-in-depth — the admin bundle isn't even fetched for a blocked visitor).
- [x] T051 Grep-verify frontend coverage: `grep -n "isLocalhostOrigin" src/App.jsx` shows exactly one call
  site, guarding the single outer `/admin` prefix check that all 5 sub-branches sit inside.
- [x] T052 Manual verification: from a non-localhost origin (or by temporarily stubbing `hostname` in a local
  test build), confirm every `/admin/*` page renders `AdminBlockedPage` and every `/api/admin/*` route 403s;
  from localhost, confirm every existing admin page/route still functions exactly as before (no regression to
  `/admin/audio`, `/admin/lessons`, `/admin/deep-reveal-eval`, `/admin/fv-suff`, or the bare `/admin`
  `AdminCuratePage` fallback).
- [x] T053 Run `npm run test:fast`; confirm green.

**Checkpoint**: Every `/api/admin/*` route and every `/admin/*` frontend route is localhost-only via one
shared guard on each side, with no pre-flight-identified blocker left unresolved.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Lockstep documentation (Constitution Principle VIII — mandatory, part of the definition of done)
and final acceptance against the epic.

- [x] T054 [P] Update `docs/architecture/frontend-conventions.md`: document `CoachMessage.audio` (the new
  additive field), `speakLessonAudio`/`getNarrationQueue` (Phase 5), the `isLocalhostOrigin`/`AdminBlockedPage`
  admin-guard pattern (Phase 8), and the `LockReason`/order-gate addition to `SagaScreen.deriveNodeState`
  (Phases 3–4).
- [x] T055 [P] Update `docs/architecture/api-conventions.md`: document
  `POST /api/admin/lessons/:id/generate-audio` and `POST /api/admin/lessons/prune-audio` (condensed from
  `contracts/lesson-audio-generation.md`), and note the 6-route `requireLocalhost` closure from Phase 8.
- [x] T056 [P] Update `docs/architecture/server-conventions.md`: document `server/lessonAudio.js`'s
  pure-function shape (mirrors `insertGameBlunder.js`) as the canonical pattern for future admin-triggered
  batch-generation modules.
- [x] T057 [P] Update `docs/architecture/data-model.md` (the project-wide doc, distinct from this feature's own
  `specs/046-.../data-model.md`) to add the `CoachMessage.audio` field if that doc separately documents the
  Lesson/CoachMessage shape — check first to avoid duplicating already-covered content.
- [x] T058 Append a `## Epic 6 — Lessons: Progression, Audio & Polish` section to `staging_checks.md` (FR-027,
  research.md R12), following the file's existing What/Why staging/Expected/Source + `- [ ]` checkbox
  convention, with exactly these 3 items:
  1. The **verbatim** FR-027 caveat: "lesson audio only serves in production after the generated MP3s are
     committed to git and the app is redeployed" (generation itself never runs in production — FR-012/FR-012a).
  2. A real-`OPENAI_API_KEY` smoke check: confirm `server/ttsProvider.js`'s `synthesize()` actually succeeds
     against the live OpenAI TTS API using a real staging key (local dev may have a stale/absent key).
  3. A genuinely clean signed-out-session order-gate check: a fresh anonymous/signed-out learner on staging
     (not a local dev profile with pre-existing `lesson_progress` rows) sees exactly lesson 1 unlocked
     (SC-001).
- [x] T059 Confirm `docs/open_issues.md` records the "no DOM/browser test harness" gap (OI-7, per plan.md
  Constitution Check III) — check whether it already exists (it should, per the handoff context noting it was
  added) before adding a duplicate entry.
- [x] T060 Final full-feature acceptance pass against `polish_epic.md`'s Epic 6 acceptance criteria and
  spec.md's corrected User Story 3 scope (narration while reading a lesson *concept* slide — NOT the Socratic
  challenge; verify against the current spec.md prose, not any earlier "while working through the Socratic
  challenge" wording), run manually/empirically end-to-end and recorded pass/fail for each: (a) fresh learner
  sees only lesson 1 unlocked, completing it unlocks lesson 2 only; (b) tier-locked tap → `UpgradeModal`,
  order-locked tap → order-lock messaging with no `UpgradeModal`; (c) admin "Generate audios" writes
  `coachMessages[].audio` paths + files under `public/audio/lessons/`, and a lesson plays audio per coach
  message on concept slides only (never on `SocraticScreen.jsx`); (d) tapping a column during active narration
  keeps the board's disc signature stable (no flicker).
- [x] T061 Run `npm run test:fast` one final time across the full feature; confirm a clean green baseline
  before considering Epic 6 shippable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: No blocking tasks (see note in Phase 2) — proceed straight to Phase 3.
- **US1 (Phase 3)**: Depends on Phase 1 only.
- **US2 (Phase 4)**: Depends on US1 (Phase 3) — reuses `deriveLockReason` introduced there. Not independently
  startable before US1, but independently *testable* once both are done (US2's tap-response behavior is a
  distinct acceptance surface from US1's node-state behavior).
- **US3 (Phase 5)**: Depends on Phase 1 only — independent of US1/US2/US4 (can be built and code-reviewed
  before any real generated audio exists, using a hand-placed test file).
- **US4 (Phase 6)**: Depends on Phase 1 only — independent of US1/US2/US3.
- **US5 (Phase 7)**: Depends on Phase 1 only — independent of US1–US4, though the flicker is "more likely to
  be noticed" once US3 narration exists (spec's "Why this priority" note); the fix itself does not require
  US3 to be merged first.
- **Admin lockdown (Phase 8)**: Independent of Phases 3–7 EXCEPT for T045/T046 specifically, which are a HARD
  dependency on Phase 6's T024/T025 (the two new lesson-audio routes must already exist in `server/index.js`
  for their grep-verification to mean anything — otherwise "coverage complete" is false-complete). T041–T044
  and T047–T053 (the pre-flight gates, the 2 existing-route fixes, and the entire frontend guard) have no
  dependency on Phase 6 and may start and finish independently/in parallel with Phases 3–7; only T045 and T046
  must wait for T024/T025.
- **Polish (Phase 9)**: Depends on all phases whose work it documents/verifies (T054–T057 can start as soon as
  their respective phase's implementation is in; T058–T061 depend on everything above being complete).

### Suggested Execution Order (single implementer)

Phase 1 → Phase 3 (US1) → Phase 4 (US2) → Phase 6 (US4) → Phase 5 (US3, using US4's real generated audio for
the manual check in T021 instead of a hand-placed stub) → Phase 7 (US5) → Phase 8 (lockdown) → Phase 9
(polish). This ordering lets US3's manual verification (T021) use real US4-generated audio rather than a
throwaway test file, without violating either story's formal independence.

### Parallel Opportunities

- Within Phase 3: T006 (test) can be written alongside T004/T005 once the function signature is settled.
- Within Phase 6: T022 ([P]) and T023 ([P]) in parallel with T024/T025 stubbed against the contract; T024 and
  T025 ([P]) are different routes, parallelizable.
- Within Phase 7: T036 and T037 ([P]) once T035's fix site is known.
- Within Phase 8: T043/T044 ([P], different routes same file — safe if done as separate sequential edits to
  avoid merge conflicts within one file); T047/T048 ([P], new isolated files).
- Phases 3–4 (US1+US2), 5 (US3), 6 (US4), and 7 (US5) can be staffed in parallel by different
  developers/agents once Phase 1 is done, since they touch disjoint files except where noted above. Phase 8's
  T041–T044 and T047–T053 may also run in parallel with Phases 3–7; T045/T046 specifically are gated behind
  Phase 6's T024/T025 (see Phase Dependencies above) and must not be started early just because "Phase 8 may
  run in parallel" — that applies to the rest of Phase 8, not to T045/T046.
- All of Phase 9's documentation tasks (T054–T057) are `[P]` — different doc files, no interdependency.

---

## Implementation Strategy

### MVP First (User Stories 1+2 only)

1. Complete Phase 1: Setup.
2. Complete Phase 3: US1 (order-gate lock state + renumbering).
3. Complete Phase 4: US2 (tier-vs-order tap messaging).
4. **STOP and VALIDATE**: fresh learner sees only lesson 1 unlocked; tapping locked lessons shows the correct
   prompt. This alone resolves the epic's most-visible regression risk (free-lesson stranding) and its primary
   pedagogical intent.

### Incremental Delivery

1. Setup → US1 → US2 → validate/demo (progression MVP).
2. Add US4 (admin audio generation) → validate real generated audio exists.
3. Add US3 (playback, using US4's output) → validate narration end-to-end.
4. Add US5 (flicker fix) → validate with narration now actually playing (US3), where the bug is easiest to
   trigger and observe.
5. Add Phase 8 (admin lockdown) → validate no admin regression, pre-flight gates cleared.
6. Phase 9 polish (docs + staging_checks.md + final acceptance pass).

### Out of Scope (do not implement, per spec.md "Out of Scope" / polish_epic.md "NOT included")

- New lesson content (slides, boardSpecs, Socratic positions).
- Live/streaming TTS generated at request time for lessons.
- Deep-reveal TTS (the `speakDeepReveal` on-demand explanation mechanism is reused as a *seam*, never modified).
- A manifest/registry file for lesson audio, or an approval workflow analogous to spec-039's coach-audio
  registry.
- Rebuilding `saveLessonProgress`/`getLessonProgress` or the tier-locked upgrade CTA's checkout wiring.
- Any change to how lesson `order` is computed/assigned beyond the one-time renumbering in T002.
- Non-linear or branching lesson prerequisite structures.
- Audio for Socratic-phase i18n-sourced messages or any `coach.*` i18n-namespace messages elsewhere in the app.
