# Implementation Plan: Lessons — Progression, Audio & Polish (Epic 6)

**Branch**: `feature/polish` | **Date**: 2026-07-11 | **Spec**: `specs/046-lessons-progression-audio-polish/spec.md`
**Input**: Feature specification from `/specs/046-lessons-progression-audio-polish/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Gate the Saga Map's lessons in strict order (an additional lock condition layered on the existing tier gate,
combined via OR, with tier winning on tap when both apply); renumber 7 lesson files (via a collision-safe
`git mv` sequence — see "Lesson rename execution order" below) so the free block (orders 1–8) and paid tail
(orders 9–13) are each internally contiguous, fixing a stranding regression; add
pre-generated, per-`coachMessage` narration audio (hash-keyed static MP3s under `public/audio/lessons/`,
authored via a new admin "generate audios" action, played back through the existing `speakDeepReveal`-style
singleton queue); close a pre-existing `/admin` localhost-lockdown gap across every `/api/admin/*` route and
every `/admin/*` frontend route via one shared guard on each side; and empirically root-cause + fix a board
re-render/flicker defect that occurs when a learner taps a column while the coach is narrating, backed by a
non-subjective regression check.

## Technical Context

**Language/Version**: JavaScript (Node 20.10+ server, React 18 frontend), ES modules throughout.
**Primary Dependencies**: Express (server), React + `react-i18next` (frontend), `server/ttsProvider.js`
(OpenAI TTS wrapper — the sole reusable synthesis seam per the epic's settled decision), Node built-in
`crypto` (text hashing, no new dependency).
**Storage**: Lesson content is flat JSON files (`connect-four/lessons/*.json`), loaded/cached at server
startup by `lessonLoader.js`. No DB schema changes in this feature — `LessonProgress` (Supabase/IndexedDB)
is read-only here. Generated audio is committed static files under `public/audio/lessons/`.
**Testing**: `node:test` + `node:assert/strict`, `npm run test:fast` (per CLAUDE.md convention) — no solver
involvement in any new logic, so nothing in this feature needs `npm test`'s slower solver-backed suite.
**Target Platform**: Same app — mobile-shell web app (`#root` capped at 480px for game surfaces; admin pages
override that locally) served from the existing Express server + Vite-built frontend.
**Project Type**: Web application (existing `connect-four/server` + `connect-four/src` monorepo layout).
**Performance Goals**: No new latency-sensitive path — lesson audio generation is a dev-only, admin-triggered
batch action (not on any user-facing request path); playback is static-file fetch, same class as existing
`public/audio/coach/*.mp3`.
**Constraints**: FR-012a — generation MUST be `requireLocalhost`-gated and MUST NOT run in production; no
production code path writes into the served build (a developer must `git add`/commit + redeploy). FR-028 —
every `/admin` surface (API + frontend) MUST be localhost-only with no exceptions.
**Scale/Scope**: 13 lesson files (7 renamed), ~1 new server module (`lessonAudio.js`), 2 new admin routes,
6 existing routes gaining one middleware each, `SagaScreen.jsx` lock-derivation change, `ConceptScreen.jsx`
narration wiring, `useCoachSpeech.js` one new export, `App.jsx` admin-guard restructuring, one flicker fix in
`ConceptScreen.jsx`/`SocraticScreen.jsx`/`Board.jsx` (site TBD by empirical debugging, per R10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I — Explanation Engine as Single Source of Truth**: N/A. Lesson audio is narration of already-authored
  coach text, not a move evaluation/pattern label/annotation; it does not bypass or duplicate the
  Explanation Engine. ✅ No violation.
- **II — Code Quality & Simplicity**: `deriveLockReason` is a small pure addition beside the existing
  `deriveNodeState`, not a new abstraction layer (R1). `lessonAudio.js` follows the existing pure-function-
  extraction pattern (`insertGameBlunder.js` precedent). No speculative generalization (e.g. no generic
  "narration provider" abstraction beyond what `synthesize(text)` already offers). ✅
- **III — Testing Standards**: No solver-dependent logic is added by this feature, so the "real solver, no
  mock" rule doesn't apply here; the *existing* solver-backed puzzle/classifier code is untouched. New pure
  functions get unit tests with fixtures/stubs per `testing-conventions.md`. The board-flicker regression
  check (FR-024/SC-007) is **resolved at plan time** (owner decision, 2026-07-11): this repo has no
  browser/DOM test harness today, so the check does not attempt to introduce one. Instead, whatever
  mechanism the User-Story-5 fix lands on (per R10, e.g. a `data-disc-key` derived from `(row, col, value)`
  per placed cell) MUST be extracted into a small, pure, testable function (e.g. a `deriveBoardSignature`-
  style helper alongside the fix site), and a `node:test` unit test MUST assert that the derived signature/
  disc-identity set is unchanged across a simulated coach-speech state transition, using the existing
  `tests/unit/` `node:test` infra — no new test-infra dependency. The manual 10-reproduction pass from
  SC-007 remains as corroborating, non-blocking evidence, not the primary bar. See research.md R11
  (updated) and R10. ✅ Resolved, not deferred — this repo's lack of a DOM/browser test harness is itself
  tracked as a standing gap in `docs/open_issues.md` (OI-7), independent of this feature.
- **IV — UX Consistency & Progressive Disclosure**: Order-lock and tier-lock messaging must be visually
  distinguishable in behavior (not necessarily resting appearance, per FR-007) but never silently swallow a
  tap (locked content always gets a response, matching "Locked paid-tier content MUST always render a
  preview card with a clear upgrade prompt; it MUST NOT be invisible or produce an error" — the order-lock
  case gets the analogous non-payment message instead of a silent no-op). ✅
- **V — Performance Requirements**: No new path touches the 2s Explanation Engine budget. Static audio file
  fetches are unbounded by this constitution section (same class as existing coach audio). ✅
- **VI — Implementation & Debugging Methodology**: Directly governs User Story 5 — the board flicker fix
  MUST be reproduced and instrumented before any fix is attempted (R10); no theoretical fix may be applied
  without first obtaining a concrete reproduction and identifying the actual re-render mechanism. tasks.md
  must sequence this as reproduce → instrument → fix → regression-proof, not skip to a guessed patch.
- **VII — Software Design Philosophy**: The `LockReason` type and `deriveLockReason` function make the
  tier-vs-order distinction explicit rather than implicit (aphorism: "Explicit is better than implicit"),
  directly serving FR-003's precedence rule. ✅
- **VIII — Documentation (pre-plan check)**:
  - [x] Existing architecture docs (`docs/architecture/frontend-conventions.md`, `api-conventions.md`,
    `server-conventions.md`, `testing-conventions.md`), the constitution, and the relevant code seams
    (`SagaScreen.jsx`, `ttsProvider.js`, `useCoachSpeech.js`, `adminAuth.js`, `App.jsx`, `lessonLoader.js`,
    `lessonAdmin.js`, `AdminLessonEditorScreen.jsx`/`SlideEditor.jsx`) were read before drafting this plan.
  - [x] No undocumented convention was discovered that blocks planning; a few small documentation gaps
    that *this feature itself creates* (new `audio` field, new admin routes, new frontend guard pattern)
    are captured as explicit tasks below, not silently skipped.
  - [ ] tasks.md MUST include explicit documentation tasks (see "Documentation tasks" below) — deferred to
    `/speckit-tasks`, tracked here as a gate for that phase.

**Gate result**: PASS. The FR-024 regression-check test-infra approach (III) is now resolved (pure-function
signature extraction + `node:test`, see above) rather than an open carry-forward; the one remaining explicit
carry-forward into tasks.md is the reproduce-first sequencing for User Story 5 (VI) — tasks.md must still
sequence reproduce → instrument → fix → regression-proof for the flicker fix itself, since the *mechanism*
(R10) is genuinely undetermined until implementation, even though the *test approach* is now settled.

## Project Structure

### Documentation (this feature)

```text
specs/046-lessons-progression-audio-polish/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── lesson-audio-generation.md
│   └── admin-localhost-guard.md
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created by this command)
```

### Source Code (repository root)

```text
connect-four/
├── lessons/
│   ├── lesson-01-immediate-threat.json          (unchanged content)
│   ├── lesson-02-block-before-build.json        (unchanged content)
│   ├── lesson-03-the-fork.json                  (unchanged content)
│   ├── lesson-04-odd-rows-belong-to-red.json    (unchanged content)
│   ├── lesson-05-claimeven.json                 (unchanged content)
│   ├── lesson-06-z-threats.json                 (unchanged content, stale order:null left as-is)
│   ├── lesson-07-opening-centre.json            (RENAMED from lesson-12-opening-centre.json)
│   ├── lesson-08-opening-imitate.json           (RENAMED from lesson-13-opening-imitate.json)
│   ├── lesson-09-undercut.json                  (RENAMED from lesson-07-undercut.json)
│   ├── lesson-10-overcut.json                   (RENAMED from lesson-08-overcut.json)
│   ├── lesson-11-figure-7-trap.json             (RENAMED from lesson-09-figure-7-trap.json)
│   ├── lesson-12-j-shape.json                   (RENAMED from lesson-10-j-shape.json)
│   └── lesson-13-opening-sharp.json             (RENAMED from lesson-14-opening-sharp.json)
├── server/
│   ├── index.js                        # +requireLocalhost on 6 routes; +2 new lesson-audio routes
│   ├── lessonAudio.js                  # NEW — hashMessageText/generateLessonAudio/pruneOrphanedLessonAudio
│   ├── ttsProvider.js                  # unchanged — reused as-is (synthesize(text))
│   ├── lessonLoader.js                 # unchanged — order still derived from filename prefix
│   └── lessonAdmin.js                  # unchanged — saveLessonFile/findLessonFile reused as-is
├── public/
│   └── audio/lessons/                  # NEW directory — committed generated MP3s
├── src/
│   ├── App.jsx                         # admin routing restructured behind one isLocalhostOrigin() guard
│   ├── lib/
│   │   ├── isLocalhostOrigin.js        # NEW — pure frontend guard predicate
│   │   └── useCoachSpeech.js           # +speakLessonAudio(path) export
│   ├── screens/
│   │   ├── SagaScreen.jsx              # +deriveLockReason, order-lock message state/UI
│   │   ├── ConceptScreen.jsx           # +narration effect over slide.coachMessages[].audio
│   │   └── SocraticScreen.jsx          # touched only if the flicker fix lands here (site TBD, R10)
│   ├── components/
│   │   ├── CoachDialog.jsx             # +optional replay control
│   │   └── Board.jsx                   # touched only if the flicker fix lands here (site TBD, R10)
│   └── pages/
│       └── AdminBlockedPage.jsx        # NEW — non-localhost /admin blocked state
└── tests/
    └── unit/
        ├── deriveLockReason.test.js    # NEW
        ├── lessonAudio.test.js         # NEW
        └── isLocalhostOrigin.test.js   # NEW
```

**Structure Decision**: Existing monorepo layout (`connect-four/server/`, `connect-four/src/`,
`connect-four/lessons/`, `connect-four/tests/`) is reused as-is — this feature adds files within the
established conventions (server pure-function modules alongside `insertGameBlunder.js`; frontend lib
utilities alongside `useCoachSpeech.js`/`useUpgradeCheckout.js`; unit tests under `tests/unit/`). No new
top-level directory or build target is introduced.

## Lesson rename execution order (Blocking-review fix — 7 renames, not 5)

The spec's "Lesson renumbering" table (spec.md) lists 7 changed rows (`lesson-01`…`lesson-06` are
untouched): `07→09`, `08→10`, `09→11`, `10→12`, `12→07`, `13→08`, `14→13`. A naive `git mv` in table order
collides: e.g. `git mv lesson-07... lesson-09...` fails/overwrites because `lesson-09-figure-7-trap.json`
still occupies slot 9 at that point. There is exactly **one** collision-safe order (each move's destination
slot must be empty — i.e. either never occupied, or already vacated by an earlier move in this sequence):

1. `git mv lesson-09-figure-7-trap.json lesson-11-figure-7-trap.json` (target 11 is the pre-existing gap —
   free from the start)
2. `git mv lesson-07-undercut.json lesson-09-undercut.json` (target 9 now free, vacated by step 1)
3. `git mv lesson-12-opening-centre.json lesson-07-opening-centre.json` (target 7 now free, vacated by step 2)
4. `git mv lesson-10-j-shape.json lesson-12-j-shape.json` (target 12 now free, vacated by step 3)
5. `git mv lesson-08-overcut.json lesson-10-overcut.json` (target 10 now free, vacated by step 4)
6. `git mv lesson-13-opening-imitate.json lesson-08-opening-imitate.json` (target 8 now free, vacated by
   step 5)
7. `git mv lesson-14-opening-sharp.json lesson-13-opening-sharp.json` (target 13 now free, vacated by
   step 6)

An equivalent alternative is a two-phase approach (move every source to a temp name first, then move every
temp name to its final name) — either is acceptable; the sequence above is the one to execute if a single
pass is preferred, since it needs no temp names.

**Lesson `id` is independent of filename** (`lessonLoader.js` reads `id` from the JSON content, not the
filename — confirmed by reading `validateLesson`/`getLesson`), so these renames do not change any lesson's
`id`, do not touch `LessonProgress` records (keyed by `lessonId`), and require no loader code change — only
the derived `order` value changes, which is exactly the intended effect.

**Mandatory post-rename verification** (explicit task, not optional): after executing the 7 `git mv`
commands, start local dev and hit `GET /api/lessons`; confirm the response's 13 entries sort into orders
1–13 with no gaps/duplicates and the free block (`free: true`) occupies exactly orders 1–8 while the paid
tail occupies exactly orders 9–13, matching spec.md's renumbering table. Do this empirically (curl/`node -e`
against the running dev server), not by re-reading the JSON/filenames (CLAUDE.md empirical-first
convention) — this is the same check research.md R2 already specifies, called out here as a required step,
not an optional one.

## Admin editor / audio-generation coordination contract (Blocking-review fix)

`AdminLessonEditorScreen.jsx`'s `handleSave` (`:117-137`) PUTs the entire in-memory `lesson` React-state
buffer to `PUT /api/admin/lessons/:id`, replacing the lesson JSON on disk wholesale. The planned "generate
audios" action (R6/FR-010) writes new `coachMessages[].audio` paths to disk via a *server-side* read
(`getLesson(id)` — not the client's buffer, per the audio-generation contract). This creates a data-loss
race: if the admin edits some other field, clicks "Generate audios" (server updates disk with new `audio`
paths), and then clicks "Save" — the client's `lesson` buffer never picked up those server-written `audio`
paths, so the Save silently overwrites them back to their pre-generation values (typically `null`), even
though *other* in-place edits already preserve `audio` correctly (`setLesson(l => ({...l, [field]: value}))`
merges are field-scoped and never touch `audio`). The risk is specifically the whole-lesson Save round-trip
racing a server-side write the client doesn't know about.

**Required coordination contract** (a task in tasks.md, not just documentation): the "Generate audios" button
handler MUST, in order:
1. Call `handleSave()` first (or an equivalent forced save of the current buffer) and await its completion,
   so the on-disk lesson matches the editor's current buffer for every field *except* `audio` before
   generation runs. This guarantees generation reads/writes against the admin's latest edits, not a stale
   disk copy.
2. Call `POST /api/admin/lessons/:id/generate-audio` (per `contracts/lesson-audio-generation.md`).
3. Take the `lesson` object from that endpoint's `200` response body (already the full updated lesson,
   including the new `audio` paths — the contract already returns this) and `setLesson(hydrated)` with it,
   exactly the same hydration the initial-load `useEffect` already performs (`:105-113`).

After step 3, the editor's buffer and disk are back in sync, so a subsequent (unrelated) `handleSave()` is a
no-op with respect to `audio` rather than a clobber. If step 1's save fails, generation MUST NOT proceed
(surface the save error instead) — generating audio against a disk copy that doesn't match what the admin
is looking at would desynchronize state in the same way, just earlier.

## Lesson-audio playback gating (Blocking-review fix)

`speakLessonAudio(path)` (R7) is a thin wrapper — `speakDeepReveal(new Audio(path))` — and, like
`speakDeepReveal` itself, does **NOT** check `speechEnabled` internally; it will play unconditionally if
called. FR-019 (respect the mute toggle) and FR-021 (stop on navigation) are therefore **caller
responsibilities**, not properties of the seam itself:

- `ConceptScreen.jsx`'s narration effect MUST read `speechEnabled` (from `useAudio()`) and skip calling
  `speakLessonAudio` entirely when it is `false` — checked at the top of the effect, not inside
  `speakLessonAudio`/`useCoachSpeech.js`. If `speechEnabled` becomes `false` while narration is already
  playing, the effect's existing cleanup (next bullet) is what stops it — there is no separate live-toggle
  interrupt path in scope for this feature (matches today's `speakCoachMessage` behavior, no regression).
- The same effect's cleanup function MUST call `stopSpeech()` (already exported from `useCoachSpeech.js`,
  already used by `DeepRevealPane.jsx`) unconditionally on unmount/navigation/slide change, regardless of
  the `speechEnabled` check above — this satisfies FR-021 and prevents orphaned audio on a different screen.

This is called out explicitly here because it is easy to assume `speakDeepReveal`/`speakLessonAudio` already
gate on the toggle (it does not) — tasks.md must include an explicit assertion/test that the narration
effect checks `speechEnabled` before calling `speakLessonAudio`, not just that `speakLessonAudio` exists.

## `/admin` lockdown pre-flight (Blocking-review fix, Decision 2)

FR-028 is a blanket lockdown covering `/admin` surfaces this epic did not originate (`/admin/audio`,
`/admin/fv-suff`, `/admin/deep-reveal-eval`, `AdminCuratePage`), not just the lesson/audio routes this epic
adds. Before implementing FR-028, tasks.md MUST include an explicit pre-flight step, sequenced *before* the
lockdown change lands:
1. Confirm no staging/QA workflow currently depends on non-localhost access to any existing `/admin/*` page
   or `/api/admin/*` route — check the `app-qa` skill's setup notes and memory
   `project_app_qa_setup_gotchas.md` for any remote/non-localhost admin usage; if a real dependency is
   found, surface it as a blocker to the owner rather than shipping the lockdown silently over it.
2. Confirm `NODE_ENV=production` is reliably set in the actually-deployed environment (Railway), since
   `requireAdmin` (`server/adminAuth.js`) is a no-op outside `NODE_ENV=production` — the *API-side* gap
   this FR closes is therefore only a real production exposure if `NODE_ENV` is in fact `production` there
   today. If it is not reliably set, the API-side urgency reassessment (still worth shipping the frontend
   guard regardless, since that has no `NODE_ENV` dependency) should be noted, not silently assumed.

Both checks are manual/empirical (grep + a Railway env inspection), not something `/speckit-plan` resolves
by reading code — research.md R9 already flags check 1 as a "manual confirmation step in tasks.md, not
something research can resolve"; check 2 is added here as the companion pre-flight item.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

No unjustified violations. The FR-024 test-infra approach is resolved above (pure-function extraction +
`node:test`, no new harness). The remaining carry-forward — User-Story-5 reproduce-first sequencing (VI) —
is a process requirement for `/speckit-tasks` to sequence explicitly, not a constitution violation requiring
a complexity-tracking justification.

---

## Documentation tasks (Principle VIII — carried into tasks.md)

- `docs/architecture/frontend-conventions.md`: document `CoachMessage.audio`, `speakLessonAudio`, the
  `isLocalhostOrigin`/`AdminBlockedPage` admin-guard pattern, and the `LockReason`/order-gate addition to
  `SagaScreen`.
- `docs/architecture/api-conventions.md`: document the two new `/api/admin/lessons/*` routes
  (`contracts/lesson-audio-generation.md` is the source; the doc gets the condensed version) and note the
  6-route `requireLocalhost` closure.
- `docs/architecture/server-conventions.md`: document `lessonAudio.js`'s pure-function shape (mirrors
  `insertGameBlunder.js`) as the canonical pattern for future admin-triggered batch-generation modules.
- `staging_checks.md`: append the `## Epic 6 — Lessons: Progression, Audio & Polish` section per FR-027/R12.
- `polish_epic.md`: no change expected (epic doc reflects already-settled decisions verbatim); flag only if
  implementation surfaces a decision that contradicts what's recorded there — do not relitigate silently.

---

*Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md) are complete. This command
stops here — proceed with `/speckit-tasks` to generate tasks.md.*
