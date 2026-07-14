# Phase 0 Research: Lessons — Progression, Audio & Polish (Epic 6)

## R1 — Order-gate computation site

**Decision**: Compute the order gate inline inside `SagaScreen.jsx`'s existing `deriveNodeState`, not as a
new hook/module. Add a sibling helper `deriveLockReason(lesson, lessons, progress, tier)` returning
`'none' | 'order' | 'tier' | 'both'`, called once per node alongside `deriveNodeState`.

**Rationale**: `deriveNodeState` already sorts `lessons` by `order` and walks progress/tier per lesson
(`SagaScreen.jsx:170-190`). The order gate needs the exact same sorted list and the same `getLessonProgress()`
data (`store.getLessonProgress()`, already fetched into `progress` state) — no new fetch, no new store method
(FR-008). Splitting lock-*reason* out from lock *state* keeps `deriveNodeState`'s existing `done/current/
unlocked/locked` return contract (spec 018) untouched while giving `handleNodeTap` (FR-003/FR-004/FR-005) the
information it needs to choose upgrade-modal vs. order-lock messaging.

**Alternatives considered**: A separate `useLessonLocking` hook — rejected as premature abstraction (Constitution
II: "no speculative abstractions... three similar lines beat a premature helper"); this is a single screen,
single call site.

## R2 — Lesson renumbering mechanics

**Decision**: Renaming is a `git mv` per row of the spec's renumbering table, executed as a batch of file
renames with no JSON content changes (except the pre-existing stale `order: null` in
`lesson-06-z-threats.json`, left untouched per spec). `getLessons()`/`getLesson()` re-derive `order` from the
new filename prefix automatically (`lessonLoader.js:145-148`) — no loader code change needed.

**Rationale**: Spec's "Lesson renumbering" table is exact and final; `lessonAdmin.js`'s `saveLessonFile`
already encodes the `lesson-<NN>-<id>.json` naming convention the admin editor uses when persisting via
`PUT /api/admin/lessons/:id`, so renaming on disk via `git mv` keeps that convention consistent with what the
editor would produce for the new `order` values.

**Verification**: After renaming, `GET /api/lessons` (learner-facing, `server/index.js`) must return the 13
lessons in the new order 1–13 with the free block (1–8) preceding the paid tail (9–13); confirmed via a
`node -e` script or `curl` against local dev, not by reading the JSON alone (CLAUDE.md empirical-first).

**Execution order**: this is 7 renames, not 5 (only `lesson-01`…`lesson-06` are untouched) — a naive
table-order `git mv` collides (destination slots are occupied by files that haven't moved yet). See
plan.md's "Lesson rename execution order" section for the one collision-safe sequence (`09→11, 07→09,
12→07, 10→12, 08→10, 13→08, 14→13`) and the mandatory post-rename `GET /api/lessons` verification step.

## R3 — Tier-vs-order tap precedence (FR-003)

**Decision**: `handleNodeTap` computes `lockReason` once and branches:
```js
if (lockReason === 'tier' || lockReason === 'both') setUpgradeOpen(true);
else if (lockReason === 'order') setOrderLockOpen(true); // new state, non-modal message
else go('concept', ...);
```
**Rationale**: Directly matches FR-003 ("tier-lock UI/prompt MUST take precedence... when locked for BOTH
reasons"). No change to the existing `UpgradeModal`/`useUpgradeCheckout` wiring (FR-026).

## R4 — Order-lock message UI

**Decision**: A lightweight inline toast/banner (not a modal), rendered in `SagaScreen` conditionally on a new
`orderLockMessage` state, auto-dismissing or dismiss-on-tap. Reuses the screen's existing layout; no new
component needed beyond a small `<div>` styled consistently with existing `--ink-soft` tokens.

**Rationale**: FR-006 requires the message be i18n'd and NOT reference payment; a modal would visually
overload a "keep going" nudge. Spec explicitly allows the resting node visual to stay identical to a
tier-locked node (FR-007) — only the *tap response* differs, so a full modal component is unnecessary
complexity for a message whose job is "you tapped the wrong thing, here's why, dismiss."

**Alternatives considered**: A generic `<Toast>` component — none exists in the codebase today; introducing
one is out of scope for a single-message use, so an inline conditional block is chosen instead (Constitution
II: no premature abstraction).

## R5 — Audio generation path & hashing

**Decision**: New pure module `server/lessonAudio.js` exporting:
- `hashMessageText(text)` → `sha256(text).slice(0, 16)` hex digest (content-addressed filename, satisfies
  FR-011's "identical text → same file, changed text → new file").
- `generateLessonAudio(lesson, { synthesize = ttsSynthesize } = {})` → async, iterates every *concept* slide's
  `coachMessages[]` (never `lesson.socratic`, per FR-010/Assumptions), skips empty/whitespace-only text
  (Edge Cases), skips messages whose current `audio` field's basename already matches
  `hash(text).mp3` (no redundant re-synthesis, FR-011), calls `synthesize(text)` from
  `server/ttsProvider.js` for the rest, writes `public/audio/lessons/<hash>.mp3`, and returns a new lesson
  object with updated `coachMessages[].audio` paths. Per-message try/catch: a synth failure leaves that
  message's `audio` unset and continues the batch (FR-015) — batch never aborts on one failure.
- `pruneOrphanedLessonAudio(allLessons)` → scans `public/audio/lessons/*.mp3`, collects the set of `audio`
  paths referenced by any lesson, deletes files not in that set, returns the deleted list (FR-014).

**Rationale**: Mirrors the "sole reusable TTS seam is `synthesize(text)`" settled decision — no i18n-manifest
machinery is reused (Epic 6 non-obvious facts / spec Assumptions). A pure module (not inline route logic) is
directly testable with a stub `synthesize` per `testing-conventions.md`'s Pure Function Extraction Pattern —
mirrors `insertGameBlunder.js`'s canonical shape (stub function, no mocking library).

**Alternatives considered**: keying by i18n key (spec-039 pattern) — explicitly rejected by the epic's settled
decision (lesson messages are raw inline text, not i18n keys, so there is no key to hash against; also
Assumptions explicitly reject a manifest/registry).

## R6 — Admin "generate audios" endpoint

**Decision**: `POST /api/admin/lessons/:id/generate-audio`, guarded `requireLocalhost, requireAdmin` (mirrors
the existing spec-039 `/api/admin/audio/generate*` gating pattern per FR-012a). Handler: load lesson via
`getLesson(id)` (server-side, avoids trusting a client-supplied lesson body), call
`generateLessonAudio(lesson)`, persist via the *existing* `saveLessonFile(LESSONS_DIR, lesson)` (same
mechanism `PUT /api/admin/lessons/:id` already uses, per FR-012), call `reloadLessons()`, respond with the
updated lesson (so the editor can refresh without a second fetch).

A second endpoint, `POST /api/admin/lessons/prune-audio`, guarded identically, runs
`pruneOrphanedLessonAudio(getLessonsAll())` and returns `{ deleted: string[] }` (FR-014, may run as a
separate maintenance action per Assumptions — not bundled into every generate call, since generation touches
one lesson but orphans can come from any lesson).

**Rationale**: Registering under `/api/admin/lessons/*` groups it with the lesson-admin route family already
in `server/index.js:749-796` (api-conventions.md route-naming: `/api/admin/<resource>`), and reuses
`getLesson`/`saveLessonFile`/`reloadLessons` rather than duplicating the lesson read/write path.

## R7 — Lesson audio playback path

**Decision**: New module-level export from `useCoachSpeech.js`: `speakLessonAudio(path)` — a thin wrapper
that does `speakDeepReveal(new Audio(path))`, i.e. literally the same mechanism `DeepRevealPane.jsx` already
uses (settled decision: "new playback path... parallel to `speakDeepReveal(audio)`"). `ConceptScreen.jsx`
gains an effect that, on `slideIndex` change (and initial mount), iterates the current slide's
`coachMessages[]` in order and calls `speakLessonAudio(m.audio)` for every message with a non-null `audio` —
relying on the *existing* module-level queue in `useCoachSpeech.js` to serialize playback one-at-a-time
(FR-016 comes "for free" per the epic's non-obvious facts / handoff note). Messages with `audio == null`
are simply skipped (no `speakLessonAudio` call at all) — satisfies FR-017 with zero special-casing.

**Rationale**: Reuses the proven singleton-queue seam instead of building a second, parallel queue —
directly satisfies "one at a time" (FR-016) without new synchronization code.

**Replay/mute (FR-018)**: `CoachDialog` gains an optional `onReplay` prop rendering a small icon button
(only when a currently-narrating lesson message exists) that re-invokes `speakLessonAudio` for the current
message set. Mute reuses the existing global `speechEnabled` toggle (`useAudio()`) — `ConceptScreen`'s
narration effect gates the whole loop on `speechEnabled`, matching FR-019 exactly like `speakCoachMessage`
already does today.

**Navigate-away stop (FR-021)**: `ConceptScreen`'s narration effect returns a cleanup calling `stopSpeech()`
(already exported from `useCoachSpeech.js`, already used by `DeepRevealPane.jsx` on dismiss) — no new stop
mechanism needed.

**Alternatives considered**: Extending `speakCoachMessage(key)` to also accept a raw path — rejected per the
epic's explicit corrected trap: that function is manifest-gated (`manifestRef.current.has(slug)`), and lesson
audio has no manifest by design (FR-013); overloading it would silently no-op every lesson message.

## R8 — Static asset serving

**Decision**: No new server route. `public/audio/lessons/*.mp3` is served by the same static-file middleware
that already serves `public/audio/coach/*.mp3` (Express `app.use(express.static(...))` on the `public/`
directory — verify the existing mount covers `public/audio/lessons` with no per-subdirectory allowlist).

**Rationale**: Spec Assumptions state this explicitly ("Static asset serving reuses the existing mechanism").

## R9 — `/admin` localhost lockdown (FR-028)

**Decision — API side**: Add `requireLocalhost` as the first middleware argument on the 6 currently-ungated
routes: the 5 lesson routes (`server/index.js:749,754,761,772,783`) and `GET /api/admin/puzzles`
(`server/index.js:802`) — becoming e.g. `app.get('/api/admin/lessons', requireLocalhost, requireAdmin, ...)`.
Also applies to the 2 new audio-generation routes from R6 (already planned with `requireLocalhost` from the
start). No new middleware is written — `requireLocalhost` already exists (`server/index.js:2795`, hoisted
usage above its definition is already the pattern for the other ~30 routes using it, since function
declarations hoist).

**Decision — Frontend side**: New tiny module `src/lib/isLocalhostOrigin.js` exporting
`isLocalhostOrigin(hostname = window.location.hostname)` → boolean (`hostname === 'localhost' || hostname ===
'127.0.0.1' || hostname === '::1'`). `App.jsx`'s `if (window.location.pathname.startsWith('/admin...'))` block
(currently 5 separate branches, `App.jsx:114-133`) is wrapped in **one** outer `if
(window.location.pathname.startsWith('/admin'))` guard that, when true, checks `isLocalhostOrigin()` before
falling into the existing 5 sub-branches; a non-localhost visitor gets a small "Not available" blocked-state
component instead of any lazy-loaded admin page import (so the admin bundle isn't even fetched — a defense-
in-depth bonus, not a requirement).

**Rationale**: Single-guard, grep-verifiable (`grep "requireLocalhost" server/index.js` shows every
`/api/admin/*` line; `grep "isLocalhostOrigin" App.jsx` shows the one frontend gate) — matches FR-028's
"single shared, reusable guard... at most one guard reference per branch" wording exactly. Extracting a pure
function (not inlining `window.location.hostname === ...` at each of 5 sites) keeps it a single source of
truth and unit-testable without a browser (pass `hostname` explicitly in tests).

**Pre-ship risk check (owner directive)**: Before shipping, confirm no staging/QA workflow depends on
non-localhost access to any of `/admin/audio`, `/admin/lessons`, `/admin/deep-reveal-eval`, `/admin/fv-suff`,
or the bare `/admin` (AdminCuratePage) — see `app-qa` skill setup notes and memory
`project_app_qa_setup_gotchas` for whether any QA flow touches these paths remotely. This is a manual
confirmation step in tasks.md, not something research can resolve by reading code.

## R10 — Board flicker root cause (User Story 5)

**Decision**: Root cause is **not** resolved by this research phase — the spec explicitly carries this
forward as an open empirical question (FR-023, spec Assumptions). Phase 0 narrows the search space instead of
guessing:

- `SocraticScreen.jsx`'s `handleColumnClick` (`:71-90`) already updates `board`/`heights`/`lastDrop` via
  local `useState` and dispatches a reducer — this is the *legitimate* board-state change on a tap (new disc
  placement), not the bug. The bug is specifically "discs **already on** the board flicker/reset," i.e.
  something causes the *existing* 41 (or fewer) already-rendered cells to be treated as new/changed DOM nodes
  by React, not just the 1 new cell.
- `Board.jsx` renders each column keyed by `col` (`:226`) and each row within a column keyed by `r` (`:306`)
  — both stable, static keys across any board array recreation of the same 6×7 shape. A `board[row][col]`
  array recreated with new array/row identity but the same keys should NOT force React to remount existing
  disc DOM nodes — this points *away* from a key-based remount theory and *toward* a conditional-render
  swap (e.g., a wrapping ternary/loadState branch, or an `Audio`-state-triggered wrapper component
  re-mount) as the more likely mechanism, but this must be **verified empirically** (Constitution VI:
  "reproduce before theorizing") — not assumed from this reading alone.
- A concrete task in tasks.md must: (1) reproduce with the visible pre-fix behavior (tap during narration,
  observe via React DevTools Profiler "why did this render" or a manual disc-identity probe), (2) identify
  the actual mechanism, (3) apply the minimal fix, (4) build the FR-024 regression check per SC-007's bar —
  a programmatic assertion of disc-signature stability (e.g., attach a stable `data-disc-key` derived from
  `(row,col,value)` per already-placed cell, snapshot the set before/after a tap-during-narration, assert
  set equality for all pre-existing cells) — not a purely visual/subjective check.

**Rationale**: Constitution VI forbids theorizing without reproduction; the spec itself (FR-023) explicitly
defers the mechanism to implementation. Planning a *process* (reproduce → instrument → fix → regression-proof)
rather than a guessed fix respects both.

## R11 — Testing approach

**Decision**: Follow `testing-conventions.md`'s Pure Function Extraction Pattern for every new piece of
business logic:
- `deriveLockReason` (R1) → pure function, unit-testable with a fixture `lessons`/`progress`/`tier` — add to
  `tests/unit/`.
- `hashMessageText`, `generateLessonAudio`, `pruneOrphanedLessonAudio` (R5) → pure/stub-injectable, unit-
  tested with a stub `synthesize` (no real OpenAI call in CI) per the `insertGameBlunder.test.js` pattern —
  add to `tests/unit/` or a new `tests/lessonAudio/`.
- `isLocalhostOrigin` (R9) → pure, unit-tested with explicit hostname args.
- Board-flicker regression (R10) → **resolved** (owner decision, 2026-07-11, carried into plan.md's
  "Constitution Check" III): this project has no browser/DOM test harness today
  (`testing-conventions.md` "Server code... has no HTTP-level test infrastructure" — same absence applies
  to component-level DOM testing), and this feature does not introduce one. Instead, whatever mechanism
  the User-Story-5 fix lands on (R10) is extracted into a small pure function (a disc-signature/identity
  derivation, e.g. keyed by `(row, col, value)` per placed cell) and asserted stable across a simulated
  coach-speech state transition via a plain `node:test` unit test in `tests/unit/` — no new test-infra
  dependency, consistent with every other pure-function test in this plan. The manual 10-reproduction pass
  (SC-007) is kept as corroborating, non-blocking evidence, not the primary bar. The absence of a DOM/
  browser test harness in this repo is tracked as a standing gap in `docs/open_issues.md` (OI-7),
  independent of this feature — not a blocker for shipping Epic 6.
- `npm run test:fast` (CLAUDE.md convention) is the runner for all new Node-side unit tests; do not add to
  `npm test`'s slower/solver-heavy path since none of this feature's logic touches the c4solver.

## R12 — `staging_checks.md` entry (FR-027)

**Decision**: Add a `## Epic 6 — Lessons: Progression, Audio & Polish` section to `staging_checks.md`
recording: (1) the mandatory FR-027 caveat text verbatim ("lesson audio only serves in production after the
generated MP3s are committed to git and the app is redeployed"); (2) a real-TTS-provider smoke check (does
`synthesize()` actually succeed against the live OpenAI TTS API when `OPENAI_API_KEY` is a real staging key —
local dev may have a stale/absent key); (3) a signed-out-session order-gate check (fresh anonymous/signed-out
learner sees exactly lesson 1 unlocked, per SC-001, confirmed against a genuinely clean staging session, not
a local dev profile with pre-existing `lesson_progress` rows).

**Rationale**: Directly required by FR-027; follows the Epic 3-established file convention (What/Why staging/
Expected/Source + `- [ ]` checkbox), confirmed by reading `staging_checks.md`'s existing epic sections.
