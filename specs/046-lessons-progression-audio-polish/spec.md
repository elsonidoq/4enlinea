# Feature Specification: Lessons — Progression, Audio & Polish (Epic 6)

**Feature Branch**: `046-lessons-progression-audio-polish`
**Created**: 2026-07-11
**Status**: Draft
**Epic**: Epic 6 — Lessons: Progression, Audio & Polish (`polish_epic.md`)
**Input**: User description: "Epic 6 — gate lessons in saga order, add pre-generated coach audio per lesson slide message, and stop the board flicker during narration."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Lessons unlock in order (Priority: P1)

A learner opens the Saga Map. Instead of every free lesson being tappable at once, only the next lesson in
the sequence is open; lessons further ahead are locked until the learner finishes the one before them.

**Why this priority**: Order is the pedagogical backbone of the Saga — without it, learners can skip
foundational lessons (e.g. "Immediate Threats") and hit advanced material (e.g. "Claimeven") with no
grounding. This is the epic's primary intent and the most visible change.

**Independent Test**: Load the Saga Map for a fresh learner (no lesson-progress records) and confirm only
lesson 1 is enterable; mark lesson 1 complete via the existing progress store and confirm lesson 2 becomes
enterable while lesson 3 remains locked.

**Acceptance Scenarios**:

1. **Given** a fresh learner with no completed lessons, **When** they open the Saga Map, **Then** only
   lesson 1 (lowest `order`) is unlocked/current; every later lesson is order-locked, regardless of its
   tier.
2. **Given** a learner has completed lesson N (a `'complete'` progress record exists for it), **When** they
   open the Saga Map, **Then** lesson N+1 is unlocked (subject to its own tier gate) and lesson N+2 remains
   order-locked.
3. **Given** a lesson is both order-unlocked and free, **When** the learner taps it, **Then** they enter the
   lesson normally (unchanged from today).
4. **Given** a lesson is order-unlocked but tier-locked (`free === false`, learner is not paid), **When** the
   learner taps it, **Then** the existing tier-lock behavior applies (see User Story 2) — order status alone
   never grants access to a paid lesson.
5. **Given** a lesson is order-locked (previous lesson not yet complete), **When** the learner taps it,
   **Then** they do NOT enter the lesson and do NOT see the paid-upgrade prompt; they see order-lock
   messaging explaining they must finish the previous lesson first.
6. **Given** the renumbered lesson catalog (see "Lesson renumbering" below), **When** a free-tier learner
   progresses through the Saga Map lesson by lesson, **Then** every free lesson is reachable by completing
   only prior free lessons — no free lesson sits behind an incomplete paid lesson in the order chain.

---

### Lesson renumbering (resolves free-lesson stranding)

The order gate in FR-001/FR-002 is a single linear chain over *all* lessons (free and paid interleaved).
Today's on-disk order is **not** grouped by tier: free lessons 1–6 are followed by paid lessons 7–10, then
free lessons 12–13, then paid lesson 14 (gap at 11). A free-tier learner who reaches lesson 7 (paid, tier-
locked) can never produce a `'complete'` record for it, so lessons 8 through 13 — including the two FREE
opening lessons at positions 12–13 — become permanently order-locked. That is a regression: those two lessons
are freely tappable today (spec 018, no order gate).

**Resolution**: reorder the lesson files so all free lessons form one contiguous initial block, followed by
all paid lessons as a contiguous tail. No tier-eligibility carve-out is added to the order gate itself — it
stays a single plain linear chain (FR-001 unchanged); the fix is purely in the renumbering. Order continues to
derive from the filename numeric prefix (spec 018 data-model.md, unchanged mechanism per the Assumptions
section below) — renumbering means renaming files, not changing the `order`-derivation logic.

Verified against each lesson JSON's `free` flag (2026-07-11):

| Old filename | `free` | Old order | New filename | New order |
|---|---|---|---|---|
| lesson-01-immediate-threat.json | true | 1 | lesson-01-immediate-threat.json | 1 |
| lesson-02-block-before-build.json | true | 2 | lesson-02-block-before-build.json | 2 |
| lesson-03-the-fork.json | true | 3 | lesson-03-the-fork.json | 3 |
| lesson-04-odd-rows-belong-to-red.json | true | 4 | lesson-04-odd-rows-belong-to-red.json | 4 |
| lesson-05-claimeven.json | true | 5 | lesson-05-claimeven.json | 5 |
| lesson-06-z-threats.json | true | 6 | lesson-06-z-threats.json | 6 |
| lesson-12-opening-centre.json | true | 12 | lesson-07-opening-centre.json | 7 |
| lesson-13-opening-imitate.json | true | 13 | lesson-08-opening-imitate.json | 8 |
| lesson-07-undercut.json | false | 7 | lesson-09-undercut.json | 9 |
| lesson-08-overcut.json | false | 8 | lesson-10-overcut.json | 10 |
| lesson-09-figure-7-trap.json | false | 9 | lesson-11-figure-7-trap.json | 11 |
| lesson-10-j-shape.json | false | 10 | lesson-12-j-shape.json | 12 |
| lesson-14-opening-sharp.json | false | 14 | lesson-13-opening-sharp.json | 13 |

Result: free block = new orders 1–8 (contiguous, no gap), paid tail = new orders 9–13 (contiguous, no gap).
Every free lesson's order-gate predecessor is itself free, so a free learner can always progress through the
entire free block without hitting a tier wall. The two previously-stranded free opening lessons
(`opening-centre`, `opening-imitate`) move to positions 7–8, ahead of every paid lesson.

The lesson-06 JSON currently carries a stale in-file `order: null` — per the Assumptions section, this field
is overwritten at load time by the filename numeric prefix and is not read at runtime; it is left as-is
(not "fixed") unless touched incidentally while renaming the file.

This renumbering (the concrete old→new filename mapping above) is an implementation task executed alongside
the order-gate code change, not a follow-up.

---

### User Story 2 — Correct prompt for each lock reason (Priority: P1)

A learner who taps a locked lesson sees a prompt that matches *why* it's locked: an upgrade prompt for a
paid-tier lesson, or a "finish the previous lesson first" message for an order-locked one. The two must never
be confused.

**Why this priority**: Showing an upgrade paywall for a free lesson the learner simply hasn't reached yet is
a confusing, revenue-irrelevant dead end; showing "keep going" copy on a genuinely paid lesson undersells the
paid tier. Both failure directions actively hurt the product.

**Independent Test**: Tap a tier-locked lesson node and confirm the upgrade modal opens; tap an order-locked
free lesson node and confirm a non-paywall message appears with no upgrade modal.

**Acceptance Scenarios**:

1. **Given** a free-tier learner taps a lesson that is locked because `free === false` and their tier is not
   paid, **When** the tap registers, **Then** the upgrade modal (with checkout entry point) opens.
2. **Given** any learner taps a lesson that is locked only because the previous lesson isn't complete yet
   (order gate), **When** the tap registers, **Then** an order-lock message is shown (e.g. "Finish the
   previous lesson to unlock this one") and the upgrade modal does NOT open.
3. **Given** a lesson is locked for both reasons at once (tier-locked AND order-locked), **When** it is
   tapped, **Then** the tier-lock (upgrade) prompt takes precedence, since it is the harder gate — order
   alone would never have granted entry.
4. **Given** a paid-tier learner, **When** they tap any lesson that is tier-eligible but order-locked,
   **Then** they see the order-lock message, never the upgrade modal (tier is already satisfied).

---

### User Story 3 — Coach narration while reading a lesson concept slide (Priority: P2)

While reading a lesson concept slide, the learner hears the coach speak each message aloud, using audio
generated ahead of time (not live TTS at request time).

**Why this priority**: Narration materially improves the teaching experience and matches the audio treatment
already shipped elsewhere in the coach (deep-reveal explanations). It depends on nothing from User Stories 1–2
and can ship independently, but is scoped after progression because progression is the higher-leverage half
of the epic's intent.

**Independent Test**: Open a lesson whose messages have generated audio and confirm each coach bubble plays
its own narration in order; open a lesson (or an individual message) with no generated audio yet and confirm
the slide still displays and reads normally with no playback error.

**Acceptance Scenarios**:

1. **Given** a *concept* lesson slide with one or more `coachMessages[]` that each have generated audio,
   **When** the slide is shown, **Then** the coach narrates each message's audio in order (one at a time, not
   overlapping). (Socratic slides have no JSON-authored `coachMessages[]` to narrate — see Scenario 5 below
   and FR-016.)
2. **Given** a coach message with no audio yet generated, **When** its slide is shown, **Then** the message
   still displays as text; there is no error, no broken-audio indicator, and no playback attempt.
3. **Given** narration is currently playing, **When** the learner wants to hear it again, **Then** a replay
   control is available.
4. **Given** narration is currently playing, **When** the learner wants silence, **Then** a mute control stops
   playback (consistent with the existing global speech-enabled toggle).
5. **Given** the Socratic screen's own per-phase messages (ask/wrong1/wrong2/correct/hint, which are i18n
   strings, not lesson-JSON `coachMessages`), **When** they are shown, **Then** they are unaffected by this
   feature — only lesson-JSON `coachMessages[]` gain generated audio.

---

### User Story 4 — Admin generates lesson audio (Priority: P2)

An admin editing a lesson in the lesson editor can trigger generation of narration audio for every coach
message in that lesson with a single action, and the resulting audio becomes available to learners without
further manual steps.

**Why this priority**: Without an authoring path, no lesson audio can ever exist; this unlocks User Story 3.
Scoped alongside it as the other half of the same capability.

**Independent Test**: In the lesson editor, trigger "generate audios" for a lesson and confirm each coach
message's `audio` path is populated and the audio file exists and plays back.

**Acceptance Scenarios**:

1. **Given** an admin is editing a lesson, **When** they trigger "generate audios," **Then** every
   `coachMessages[]` entry on every *concept* slide in that lesson gets a narration file generated and its
   `audio` path saved back into the lesson JSON. (Socratic-phase prompts are i18n-driven, not lesson-JSON
   `coachMessages[]` — see the Assumptions section — and are out of scope for generation.)
2. **Given** a coach message's text is later edited, **When** "generate audios" is triggered again, **Then**
   only that message's audio is (re)generated — unchanged messages are not needlessly re-synthesized, and the
   new audio reflects the new text.
3. **Given** generation completes, **When** the admin reloads the lesson in the editor or a learner opens the
   lesson, **Then** the saved `audio` paths resolve and play without any additional admin action (e.g. no
   separate "publish" or "approve" step).
4. **Given** a message's text changes and its audio is regenerated, **When** the old audio file is no longer
   referenced by any message, **Then** it is eligible for cleanup (pruned) rather than accumulating
   indefinitely — this MAY happen as part of generation or as a separate maintenance action, but stale files
   must not silently persist as required assets.

---

### User Story 5 — No board flicker while the coach speaks (Priority: P2)

A learner taps a column on the board while the coach is narrating a message. The board does not visibly
flicker, flash, or appear to reset — only the intended game-state change (if any) happens.

**Why this priority**: This is a concrete, reported UX defect independent of the audio and progression work;
it can be fixed and verified on its own, though it is more likely to be *noticed* once narration exists (User
Story 3), since narration is what's active when the flicker was observed.

**Independent Test**: On the Socratic screen (interactive board) with narration playing, tap a column and
observe the board visually — discs already on the board must not blink, disappear, or redraw during the tap,
even though the coach's message/audio state changes as a result of the tap.

**Acceptance Scenarios**:

1. **Given** the coach is narrating a message on a lesson slide, **When** the learner taps an interactive
   column on the board, **Then** the previously-placed discs remain visually stable (no flicker/flash) while
   the new disc is placed and the coach state updates.
2. **Given** the coach is narrating a message, **When** narration ends or a new message begins narrating as a
   *result* of a board interaction, **Then** the board's rendering of existing discs is unaffected by that
   narration state change.
3. **Given** the flicker is reproduced before the fix and absent after, **When** verified via automated or
   manual regression check, **Then** the check is repeatable and does not rely on subjective visual judgment
   alone (e.g. checks that the rendered disc data/identity is stable across the state transition).

---

### Edge Cases

- **First lesson has no predecessor**: Lesson 1 (lowest `order`) is never order-locked — there is no
  "previous lesson" to require.
- **Learner replays an already-completed lesson**: Re-entering a `done` lesson from the Saga Map is
  unaffected by the order gate (it was already unlocked when first completed, and completion is never
  un-set — consistent with spec 018's existing replay behavior).
- **Lesson list has gaps or is reordered**: The order gate is computed purely from each lesson's `order`
  value and the existence of a `'complete'` progress record for the lesson immediately preceding it in
  sorted order — not from lesson `id` or file naming.
- **Two lessons share the same completion prerequisite chain but a middle lesson is deleted/unpublished**:
  Out of scope — lesson catalog membership changes are not covered by this feature; the order gate operates
  on whatever list `GET /api/lessons` currently returns.
- **Coach message text is empty or whitespace-only**: No audio is generated for it (nothing to narrate); it
  displays as before with no playback attempt.
- **Audio generation fails for one message (e.g. transient provider error)**: Other messages in the same
  batch still complete; the failed message's `audio` field is left unset (null) so playback falls back
  gracefully per User Story 3, Scenario 2, and the admin can retry.
- **Learner has speech/narration disabled globally**: No lesson audio plays regardless of what's generated,
  consistent with the existing global speech toggle.
- **Learner navigates away mid-narration**: Playback stops; no orphaned audio continues playing on a
  different screen.
- **Admin regenerates audio for a lesson that has zero coach messages with text**: The action completes as a
  no-op; no error.

---

## Requirements *(mandatory)*

### Functional Requirements — Order-based unlocking (User Stories 1–2)

- **FR-001**: The Saga Map MUST compute an additional lock condition per lesson — "order-locked" — that is
  `true` when the immediately-preceding lesson (by ascending `order`) does not have a `'complete'` progress
  record for the current learner, and `false` for the lowest-`order` lesson (no predecessor) or when the
  preceding lesson is complete.
- **FR-002**: A lesson's final displayed lock state MUST combine the existing tier gate (spec 018 FR-003 rule
  4: `free === false && tier !== 'paid'`) with the new order gate from FR-001 via logical OR — a lesson is
  locked if either condition holds. This is a deliberate override of spec 018 FR-003 rule 4, which specified
  tier as the *only* lock condition.
- **FR-003**: When a lesson is locked for BOTH reasons at once, the tier-lock UI/prompt (upgrade modal) MUST
  take precedence over the order-lock message. (Owner-confirmed 2026-07-11: tier wins. Order status alone
  would never have granted entry to a tier-locked lesson, so the harder gate governs the tap response.)
- **FR-004**: When a lesson is locked ONLY by the order gate (tier gate passes or doesn't apply), tapping it
  MUST show order-lock messaging and MUST NOT open the upgrade modal.
- **FR-005**: When a lesson is locked ONLY by the tier gate (order gate passes), tapping it MUST continue to
  open the upgrade modal exactly as it does today (no regression to the already-shipped `setUpgradeOpen(true)`
  + `useUpgradeCheckout` wiring).
- **FR-006**: The order-lock message MUST be a localized (i18n) string distinct from the tier-lock messaging,
  and MUST NOT reference payment/upgrading.
- **FR-007**: The `current`/`unlocked`/`done` node-state visuals (spec 018 FR-004–FR-007) remain governed by
  the combined lock state from FR-002 — a node that is order-locked renders with locked styling, the same
  visual treatment as a tier-locked node (padlock etc.), but MUST be distinguishable on tap via FR-004/FR-005
  (the distinguishing signal is in the tap response, not necessarily the resting visual — the resting-state
  visual for order-locked vs. tier-locked nodes MAY be identical; this is not a hard requirement).
- **FR-008**: The order gate MUST use the already-existing `getLessonProgress()` store read; no new
  progress-tracking mechanism, storage table, or API is introduced.

### Functional Requirements — Lesson audio generation (User Story 4)

- **FR-009**: The lesson content schema MUST gain an additive, optional field `audio` (nullable string —
  a path) on each entry of `Slide.coachMessages[]`. Lessons/messages without this field (or with it `null`)
  remain fully valid and behave exactly as before this feature (no playback attempted).
- **FR-010**: The lesson editor MUST offer an admin-triggered action ("generate audios") that, for the lesson
  currently being edited, synthesizes narration for every `coachMessage.text` on that lesson's *concept*
  slides that does not already have current audio for its exact text. Socratic-phase prompts are i18n-string
  driven (spec 018 FR-023), carry no `coachMessages[]` in the lesson JSON, and are excluded from this action.
- **FR-011**: Regeneration MUST be text-driven: identical message text always maps to the same generated
  audio (so unchanged messages are not redundantly re-synthesized on repeated runs), and a change to a
  message's text MUST produce new audio distinct from the old file rather than silently reusing/overwriting
  stale audio under the same identity.
- **FR-012**: Generated audio files MUST be saved as static assets under a lesson-specific audio directory
  (`public/audio/lessons/`, served publicly with no authentication once deployed, mirroring existing
  `public/audio/coach/*.mp3` handling), and the corresponding `coachMessages[].audio` path MUST be persisted
  back into the lesson's JSON via the same persistence mechanism the lesson editor already uses to save lesson
  edits. Generation is a **dev-only, local-filesystem write**, not a production runtime action — see FR-012a.
- **FR-012a**: The "generate audios" action (FR-010) and any pruning action (FR-014) MUST be gated the same
  way the existing spec-039 coach-audio generation endpoints are gated: `requireLocalhost` (see FR-028). A
  request reaching production (or any non-localhost origin) MUST be rejected before any file write or LLM/TTS
  call is attempted. Generated MP3s are written to the developer's local `public/audio/lessons/` working tree;
  making them available in production requires a developer to `git add`/commit those files and redeploy —
  there is no in-app "publish" step and no server-side write path that reaches the deployed build directly.
- **FR-013**: This feature introduces NO manifest, registry, or approval-workflow file for lesson audio (in
  contrast to the existing i18n-keyed coach-audio system) — the lesson JSON's own `audio` field is the sole
  source of truth for whether a given message has narration and where it lives.
- **FR-014**: Audio files that become orphaned (no `coachMessages[].audio` field in any lesson currently
  references them, e.g. after a text edit regenerates a message's audio) MUST be identifiable and prunable;
  they must not be required to persist indefinitely as live assets.
- **FR-015**: Generation of one message's audio failing (e.g. provider error) MUST NOT abort generation for
  the rest of the batch, and MUST leave that message's `audio` field unset rather than pointing at a
  nonexistent or corrupt file.

### Functional Requirements — Lesson audio playback (User Story 3)

- **FR-016**: When a *concept* lesson slide is shown, each `coachMessage` with a non-null `audio` field MUST
  have its narration played in the order the messages appear, one at a time (no overlapping playback),
  consistent with the app's existing single-active-narration behavior. Socratic slides carry no lesson-JSON
  `coachMessages[]` (their prompts are i18n-driven, per the Assumptions section) and are therefore out of
  scope for this requirement — no audio playback is added to the Socratic phase by this feature.
- **FR-017**: A `coachMessage` with a null/missing `audio` field MUST render its text with no playback attempt
  and no error state shown to the learner.
- **FR-018**: The learner MUST have a way to replay the currently-relevant narration and a way to mute/stop
  it, consistent with the app's existing global speech-enabled control.
- **FR-019**: Lesson audio playback MUST respect the existing global speech-enabled/disabled toggle — when
  speech is disabled, no lesson audio plays. The playback seam itself (`speakLessonAudio`, a thin wrapper
  over the existing `speakDeepReveal` mechanism) does NOT check this toggle internally, consistent with how
  `speakDeepReveal` already behaves — enforcement is the responsibility of whatever screen-level code calls
  `speakLessonAudio` (per plan.md's "Lesson-audio playback gating" section): it MUST check the toggle before
  calling, not rely on the seam to no-op.
- **FR-020**: Lesson audio playback is independent of the i18n-key-driven coach-speech manifest system (the
  system used for `coach.*` namespace keys) — a lesson message's audio eligibility is determined solely by
  whether its own `coachMessages[].audio` field is populated, not by any manifest lookup.
- **FR-021**: Navigating away from a lesson screen MUST stop any in-progress lesson narration. As with
  FR-019, the playback seam does not stop itself on navigation — this MUST be implemented as the calling
  screen's effect-cleanup (e.g. an unmount/navigation cleanup calling the existing `stopSpeech()`), not as
  a property of `speakLessonAudio` itself.

### Functional Requirements — Board stability during narration (User Story 5)

- **FR-022**: Tapping an interactive board column while a coach message is narrating MUST NOT cause discs
  already on the board to visually flicker, flash, disappear, or re-render in a way perceptible as a "reset"
  — only the new disc placement (and any board state change the tap causes) is visible.
- **FR-023**: The specific rendering mechanism that isolates the board from coach/narration state changes is
  intentionally left unspecified at the spec level — the root cause of the current flicker has not yet been
  isolated (open `/clarify` item carried from the epic; see below). The acceptance bar is behavioral: board
  disc state must remain visually and referentially stable across a coach-speech state transition triggered
  by a board tap.
- **FR-024**: A regression check (automated or documented manual procedure) MUST exist that can detect
  recurrence of the flicker without relying purely on a human's subjective "did it flicker" judgment.

### Cross-cutting

- **FR-025**: All new user-facing strings (order-lock messaging, audio playback controls) MUST go through
  `t()` i18n keys, per project convention — no hardcoded English strings in component render output.
- **FR-026**: Nothing in this feature modifies `saveLessonProgress`/`getLessonProgress` (SupabaseStore.js /
  IndexedDBStore.js) or the underlying `UpgradeModal` / `useUpgradeCheckout` checkout flow — both are
  consumed as-is.
- **FR-027**: Any acceptance item from this spec that cannot be fully exercised/confirmed in local
  development (e.g. anything depending on a real narration-provider API call succeeding under production
  network/quota conditions, or confirming static lesson-audio assets are actually served correctly once
  deployed) MUST be recorded in `staging_checks.md` under an "Epic 6 — Lessons: Progression, Audio & Polish"
  heading rather than being silently marked done. This MUST explicitly include: "lesson audio only serves in
  production after the generated MP3s are committed to git and the app is redeployed" (per FR-012/FR-012a —
  generation itself never runs in production).

### Cross-cutting — `/admin` localhost lockdown (owner directive)

**Inventory (as of 2026-07-11)**, grounding the requirement below:

- *API* (`connect-four/server/index.js`): all `/api/admin/*` routes use `requireAdmin`. A `requireLocalhost`
  middleware already exists (defined at `server/index.js:2795`, used as the first middleware on most
  `/api/admin/*` routes — eval-sets, eval-results, fv-suff, reason, candidate-generator, audio/prompt,
  audio/status, audio/generate*, audio/approve*, tts/cleanup, seed-puzzles, puzzles POST, etc.). **Two route
  groups currently lack it**: the five lesson-admin routes (`GET/POST/PUT/DELETE /api/admin/lessons[/:id]`,
  `server/index.js:749-796`) and `GET /api/admin/puzzles` (`server/index.js:802`) — all six currently run with
  only `requireAdmin` (which itself is a no-op outside `NODE_ENV=production`, per `server/adminAuth.js`), so
  in production a non-localhost caller with `req.user.email` in `ADMIN_EMAILS` could reach them.
- *Frontend* (`connect-four/src/App.jsx:114-133`): five path-prefix branches (`/admin/audio`, `/admin/lessons`,
  `/admin/deep-reveal-eval`, `/admin/fv-suff`, and the bare `/admin` fallback → `AdminCuratePage`) lazy-load
  admin pages with **no client-side localhost/environment check at all** today — access control for the
  frontend routes currently relies entirely on the backing API calls rejecting non-localhost requests, which
  FR-028 closes for the API side but the frontend UI itself is otherwise fully reachable in production.

- **FR-028**: Every `/admin` surface — every `/api/admin/*` Express route AND every `/admin/*` frontend route
  in `App.jsx` — MUST be localhost-only, with NO exceptions, enforced via a single shared, reusable guard on
  each side (not bespoke per-route logic):
  - *API*: every `/api/admin/*` route MUST carry the existing `requireLocalhost` middleware as one of its
    route handlers (a single middleware reference per route — e.g. `app.get('/api/admin/x', requireLocalhost,
    requireAdmin, ...)`). This closes the two gaps identified above (the five lesson routes + the puzzles
    GET route) by adding the same one-liner already used on every other `/api/admin/*` route; no new
    middleware is introduced.
  - *Frontend*: a single shared guard (e.g. a small `isLocalhostOrigin()` check reused for all five branches,
    or one check wrapping the entire `if (pathname.startsWith('/admin'))` block in `App.jsx`) MUST gate access
    to every admin page before it renders — at most one guard reference per branch (or one reference covering
    all branches, since they already share the `/admin` prefix). A non-localhost visitor to any `/admin/*`
    URL MUST see a non-functional/blocked state, not the admin UI.
  - Coverage is verifiable by grep: every `app.<verb>('/api/admin/...')` line must show `requireLocalhost` in
    its handler list, and every `/admin` branch in `App.jsx` must be reachable only through the shared guard.
  - **Scope note**: this requirement covers the routes inventoried above (all existing `/api/admin/*` API
    routes and all existing `/admin/*` frontend routes, including the lesson-editor and audio-generation
    routes this epic adds) — it does not otherwise change `requireAdmin`'s email-allowlist semantics or any
    non-admin auth flow. Risk: because this is a blanket lockdown of routes this epic did not all originate
    (e.g. `/admin/audio`, `/admin/fv-suff`, `/admin/deep-reveal-eval`, `AdminCuratePage`), implementation MUST
    confirm no currently-relied-upon non-localhost admin usage (e.g. a staging QA workflow) exists before
    shipping; if one does, that MUST be surfaced as a blocker rather than silently breaking it.

---

### Key Entities

- **Lesson** (existing, per spec 018 data-model.md): unchanged shape; `slides[].coachMessages[]` gains the
  new optional `audio` field described below. No new top-level lesson fields.
- **CoachMessage** (existing, extended): `{ text: string, lead?: string, faded?: boolean, mood?: string,
  audio?: string | null }` — `audio` is the new field this spec adds; when present it is a path to a
  pre-generated narration file for exactly that message's current `text`.
- **LessonProgress** (existing, unchanged): `{ lessonId, status: 'complete' }`, read via the existing
  `getLessonProgress()`. This feature reads it to compute the order gate but adds no new fields or records.
- **NodeState** (existing enum from spec 018, unchanged set of values: `done | current | unlocked | locked`):
  the *derivation* of `locked` gains a second contributing condition (order), per FR-002; the enum itself is
  unchanged.
- **LockReason** (new, client-side-only concept, not persisted): distinguishes *why* a node is locked —
  `tier` vs. `order` (or both, in which case `tier` governs the tap response per FR-003). Exists only to drive
  which prompt appears on tap; it is not part of the `NodeState` enum and is not returned by any API.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A fresh learner sees exactly one enterable (non-order-locked, subject to tier) lesson on the
  Saga Map — the first by order.
- **SC-002**: Completing a lesson unlocks exactly the next lesson in order, with no lesson becoming
  accessible out of sequence.
- **SC-003**: 100% of taps on an order-locked (but not tier-locked) node show order-lock messaging with zero
  upgrade-modal opens; 100% of taps on a tier-locked node (regardless of order status) open the upgrade modal.
- **SC-004**: Every coach message with generated audio narrates automatically when its slide/phase is shown,
  with no overlapping or out-of-order playback.
- **SC-005**: A lesson with zero generated audio (or partially generated audio) is fully readable and
  functionally complete-able with no playback errors surfaced to the learner.
- **SC-006**: An admin can generate narration for an entire lesson's coach messages in a single action,
  without hand-editing the lesson JSON's `audio` fields directly.
- **SC-007**: Board flicker while narration plays is eliminated, verified objectively: the board's rendered
  disc signature (a stable identity/value derived from placed-disc state — e.g. an unchanged React key,
  DOM-node identity, or equivalent per-cell state snapshot for every already-placed disc) is provably
  unchanged across the coach-speech state transition triggered by a column tap during active narration —
  consistent with FR-024's requirement for a non-subjective regression check. The specific signature
  representation is an implementation choice (see FR-023); the bar is that it can be asserted programmatically,
  not eyeballed. A supporting (non-blocking) manual pass — tapping a column during active narration across at
  least 10 consecutive reproductions of the previously-reported trigger with no visible flicker observed — MAY
  additionally be recorded as corroborating evidence, but is not itself the success bar.

---

## Assumptions

- **Order is defined by the existing `order` field**: derived at lesson-load time from filename numeric
  prefix, per spec 018 data-model.md — this feature does not change how `order` is computed, only how it's
  used for locking.
- **The order chain is linear**: "the previous lesson" means the lesson with the next-lowest `order` value,
  not a lesson-authored dependency graph. Non-contiguous or branching prerequisite structures are out of
  scope.
- **Socratic-phase messages (`ask`/`wrong1`/`wrong2`/`correct`/`hint`) stay i18n-key-driven**: per spec 018
  FR-023, these are sourced from `en.json`, not lesson JSON `coachMessages[]`. Verified against the actual
  lesson data (all 13 files in `connect-four/lessons/`): no lesson JSON has `coachMessages[]` on a Socratic
  slide — that field exists only on concept slides. This feature's new `audio` field therefore applies
  strictly to concept-slide `coachMessages[]`; it does not add audio to the Socratic phase in any form. If a
  learner-facing gap exists here after implementation, it is deferred, not silently expanded into scope.
- **Sole reusable TTS seam is `server/ttsProvider.js` `synthesize(text)`**: the i18n-keyed
  registry/manifest/`speakCoachMessage(key)` machinery built for spec 039 does not apply to lesson audio and
  is not reused, consistent with the epic's settled decision.
- **No manifest/registry for lesson audio**: unlike the spec-039 coach-audio system, this feature stores the
  single source of truth for audio availability directly on each `coachMessage` object in the lesson JSON.
- **Static asset serving reuses the existing mechanism**: lesson audio files are served the same way existing
  `public/audio/coach/*.mp3` files are (static asset passthrough), requiring no new serving route. The
  generation path (admin action) is new server-side work, but it is **dev-only** (see FR-012/FR-012a): files
  it writes locally only become servable in production once a developer commits them to git and redeploys —
  there is no production code path that writes into the served build.
- **`/admin` localhost lockdown (FR-028) is a blanket change**, not scoped only to the lesson/audio routes
  this epic adds — it closes two pre-existing gaps (`/api/admin/lessons*`, `/api/admin/puzzles` GET) and adds
  a first-ever frontend guard to all five `/admin/*` page branches in `App.jsx`. This is broader than this
  epic's own surface area, per explicit owner directive; see the Risk note under FR-028 for the mitigation
  (confirm no relied-upon non-localhost admin usage before shipping).
- **Text-hash-based file naming** is a reasonable default for satisfying FR-011 (same text → same file,
  changed text → new file) but the exact hash function/algorithm is an implementation decision, not fixed by
  this spec.
- **Orphan pruning (FR-014) may be deferred to a follow-up maintenance task** rather than blocking ship of
  generation/playback, provided orphaned files are at minimum identifiable.
- **Root cause of the board flicker (User Story 5) is not yet known** — reproduction (tap during narration)
  is established, but whether it's a Board remount, prop-identity churn, or something else in
  `ConceptScreen.jsx`/`SocraticScreen.jsx`'s state management is an open empirical question to resolve during
  implementation, per the epic's carried-forward `/clarify` item.
- **This feature does not touch deep-reveal TTS, live/streaming TTS, or new lesson content** — those are
  explicitly out of scope (see below).

---

## Out of Scope

- New lesson content (slides, boardSpecs, Socratic positions) — spec 019 territory.
- Live/streaming TTS generated at request time for lessons — this feature is stored/pre-generated audio only.
- Deep-reveal TTS (the dynamic on-demand explanation narration) — Epic 2/7 territory, already using a
  different mechanism (`speakDeepReveal`) that this feature parallels but does not modify.
- A manifest or registry file for lesson audio, or an approval workflow analogous to spec 039's coach-audio
  registry — explicitly rejected for this feature.
- Rebuilding or modifying `saveLessonProgress`/`getLessonProgress` — already implemented (spec 018/Epic 5).
- Rebuilding the tier-locked upgrade CTA's checkout wiring itself — already implemented (Epic 5); only the
  tier-vs-order lock distinction on top of it is new.
- Any change to how lesson `order` is computed or assigned.
- Non-linear or branching lesson prerequisite structures.
- Audio for Socratic-phase i18n-sourced messages (`ask`/`wrong1`/`wrong2`/`correct`/`hint`) or for any
  `coach.*` i18n-namespace messages elsewhere in the app (those remain governed by the existing spec-039
  system, untouched by this feature).
