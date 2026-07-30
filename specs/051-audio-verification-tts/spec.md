# Feature Specification: Audio Verification & TTS Management

**Feature Branch**: `051-audio-verification-tts`
**Created**: 2026-07-29
**Status**: Draft
**Input**: User description: "Epic 5 — Audio Verification & TTS Management" (`docs/epics/open-issues-epics.md`)

## Summary

A parallel work session already shipped the bulk of the app's coach and lesson audio content. What
remains is: (1) **proving** that shipped content actually works end-to-end rather than trusting static
field-presence checks, (2) giving the owner a single admin surface to audition and manage **every** clip
in the app — lesson narration has none today, (3) three narrowly-scoped correctness bugs, (4) regenerating
a confirmed-stale batch of English coach clips, and (5) closing off the exact failure mode that let those
clips go stale — a single, guaranteed synthesis path so "the model changed but old clips didn't
regenerate" can never recur silently.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prove the shipped audio actually works (Priority: P1)

The owner needs confidence — not an assumption — that the audio a parallel session already generated for
all 15 lessons and both languages is complete, non-orphaned, actually in the target language when played,
and narrates correctly on every learner-facing screen including the Socratic exercises. Field presence in
the lesson JSON is not proof of a working clip.

**Why this priority**: Every other story in this epic either builds on top of this content (US2's admin
surface for auditioning it, US5's re-approval of a regenerated fleet) or depends on knowing precisely what
is and isn't already fixed (US1 is what tells the rest of the epic whether the lesson half of OI-32 needs
regeneration or just confirmation). Shipping US2–US5 against unverified content risks building tooling
around audio that turns out to be broken.

**Independent Test**: Can be fully executed with no code changes beyond a test file — run the coverage
test, run the pruner, run the two-pass Socratic check (automated, asserting playback starts/stops rather
than an owner listening), and close out the issues that verification confirms are done. The by-ear
language-authenticity and accent checks are recorded as sign-off items in `staging_checks.md` rather than
gating this story's completion (see FR-003/FR-004/FR-005). Delivers value on its own: the owner gets a
definitive, evidenced answer to "does the Spanish audio actually work" instead of trusting a rewrite date.

**Acceptance Scenarios**:

1. **Given** the full set of 15 lesson JSON files, **When** the coverage test walks every narratable
   message the production message-walker yields, **Then** every message has a non-empty audio path for
   each language it has text in, and the referenced file exists on disk — with zero exceptions.
2. **Given** the current lesson audio directory and the full set of lesson JSON files, **When** the
   orphan-pruning pass runs, **Then** it reports zero files deleted.
3. **Given** a lesson that has a Spanish audio clip attached to a slide, **When** an owner opens that
   lesson in the real learner app (served from the dev-server port, not the API port) with the language
   set to Spanish, **Then** the clip that plays is intelligible, natural-sounding Spanish — not an English
   recording serving under Spanish text; this is recorded as a `staging_checks.md` sign-off item (FR-003)
   rather than a gate on this story's completion.
4. **Given** the same check for a coach clip (not lesson narration) in Spanish, **When** it plays in the
   real app, **Then** it is likewise genuine Spanish audio; also recorded as a `staging_checks.md` sign-off
   item (FR-003) rather than a gate on this story's completion.
5. **Given** a Socratic exercise screen, **When** an automated check drives it without ever clicking Hint,
   **Then** every phase's bubble narrates its own message, including the reward message on a correct
   answer, and navigating away mid-narration stops playback — asserted programmatically (audio-element
   state), not by an owner listening.
6. **Given** the same Socratic exercise, **When** an automated check clicks Hint at least once during the
   run, **Then** narration still plays for the phases reached, understanding that hint interaction may
   prevent ever reaching the reward message (a known, separate defect this story does not fix).
7. **Given** a sample of coach and lesson clips, **When** an owner listens for accent quality, **Then** the
   Spanish audio sounds like a native Rioplatense/Argentine speaker, not an English speaker reading Spanish
   phonetically; recorded as a `staging_checks.md` sign-off item (FR-005) rather than a gate on this
   story's completion.
8. **Given** the lesson mp3s already on disk (last rewritten during a recent content pass), **When** their
   generation timestamps or an equivalent freshness signal are checked against the date the coach fleet's
   TTS model was switched away from the legacy model, **Then** the check yields an explicit, evidenced
   verdict — "current" or "stale" — never an assumption drawn from the rewrite date alone.

---

### User Story 2 - Audition and manage lesson audio from one admin surface (Priority: P1)

The owner needs to listen to any lesson clip — in either language, for any message on any slide or in the
Socratic flow — from the same admin page already used to manage coach audio, instead of hand-computing a
text hash and hunting for the file on disk.

**Why this priority**: This is the epic's headline gap. Without it, nothing in this epic (including
re-approving a regenerated coach fleet in US5, or judging accent quality in US1) can happen without
leaving the admin UI, and the owner has explicitly asked for one place to manage every clip in the app.

**Independent Test**: Can be tested independently by opening the existing coach-audio admin page, finding
a new Lessons section, and confirming every message in a given lesson can be listened to and
(re)generated without touching any coach-audio functionality on the same page.

**Acceptance Scenarios**:

1. **Given** the existing coach-audio admin page, **When** an owner opens it, **Then** a Lessons section is
   present listing every lesson, and for each lesson, every narratable message grouped by the slide or
   Socratic phase it belongs to.
2. **Given** a listed message, **When** the owner switches the page's language toggle between English and
   Spanish, **Then** the same message's status and audio reflect the selected language, exactly like the
   existing coach-audio section already behaves.
3. **Given** a listed message with an existing audio clip, **When** the owner presses play, **Then** the
   clip plays inline without navigating away from the admin page.
4. **Given** a listed message, **When** the owner triggers generation for that single message, **Then**
   only that message's audio is (re)synthesized and the page reflects the new state without a full page
   reload.
5. **Given** a lesson's audio status is displayed, **When** the underlying lesson JSON changes on disk (a
   new message added, an existing message's text edited), **Then** the displayed status is computed fresh
   from the current lesson content the next time it is viewed — never from any separately stored record of
   past generations.
6. **Given** the pre-existing coach-audio status list, config editor, and preview sandbox on the same
   admin page, **When** the Lessons section is added, **Then** none of the pre-existing coach-audio
   functionality changes behavior.

---

### User Story 3 - Fix the three correctness bugs that survived the content pass (Priority: P2)

Four narrow, independent defects remain in the TTS pipeline even though the bulk content work is done: a
regenerated approved clip goes live without warning, a locale-cleanup operation can null out audio for the
wrong language's cached row, and a validation bug silently drops audio for the very first move of a game.

**Why this priority**: Each is a real, user-visible or data-integrity defect, but none blocks the
higher-value work in US1/US2, and none has design ambiguity left (see Settled Decisions in the source
epic) — they're independent, mechanical fixes that can land in any order relative to each other.

**Independent Test**: Each of the three fixes below can be verified in isolation with its own regression
test and does not require the other two to be present.

**Acceptance Scenarios**:

1. **Given** a coach audio clip that has already been approved, **When** an owner triggers regeneration for
   that same clip from the admin page, **Then** the page displays an explicit warning that the new
   recording will go live immediately, unreviewed, before the request is sent — the clip still publishes
   immediately once confirmed (no approval gate is introduced).
2. **Given** a cached explanation whose English row is being expired for staleness, **When** the cleanup
   operation runs, **Then** only the row matching both the position and the language actually being expired
   has its audio path cleared — a different language's cached row for the same position is left untouched.
3. **Given** the very first move of a game (an empty starting position), **When** a learner requests the
   deep-reveal narration for their first move, **Then** audio is returned instead of a validation error.
4. **Given** each of the three fixes above, **When** its regression test runs, **Then** it fails against the
   pre-fix behavior and passes after the fix, independent of the other two fixes.

---

### User Story 4 - Localize the blunder one-liner (Priority: P3)

A Spanish-speaking learner should read the short "one-liner" explanation of a mistake in Spanish, not
English — today it is always generated in English regardless of the learner's locale, because the
generation pipeline that produces it has no way to know the caller's language at all.

**Why this priority**: Real, reported localization gap, but it is scoped as its own story because the fix
requires plumbing a locale value through a pipeline that currently carries none — a larger, more
architectural change than the mechanical fixes in US3 — and because it must make an explicit decision
about a pool of already-cached English results.

**Independent Test**: Can be tested independently by requesting a mistake explanation as a Spanish-locale
caller (freshly, not from cache) and confirming the one-liner text comes back in Spanish, without needing
US1–US3 to be complete.

**Acceptance Scenarios**:

1. **Given** a Spanish-locale caller triggering a fresh (not previously cached) mistake explanation,
   **When** the one-liner is generated, **Then** its text is in Spanish.
2. **Given** an English-locale caller triggering the same kind of request, **When** the one-liner is
   generated, **Then** its text is in English, unchanged from current behavior.
3. **Given** a one-liner already cached in English before this fix, **When** a Spanish-locale caller
   requests the explanation for that same position afterward, **Then** the caller sees the English row
   unchanged, per the owner-ratified decision not to backfill (see Assumptions and FR-021) — that row is
   naturally replaced the next time the same position's explanation is regenerated for a Spanish-locale
   learner.

---

### User Story 5 - Regenerate the stale coach fleet and guarantee it cannot go stale silently again (Priority: P2)

The ~217 English coach clips synthesized weeks before the app's TTS model was upgraded still carry the old,
unstyled, English-accented voice. This story regenerates and re-approves that entire fleet on the current
model, confirms the lesson clips are current rather than assuming it, and — critically — closes off the
mechanism that let this drift happen unnoticed: today three independent places in the codebase can trigger
TTS synthesis, and one of them currently never applies the configured voice style at all, regardless of
model. After this story, there must be exactly one way to synthesize a clip, and it must be impossible for
any caller to ship an unstyled or wrong-model clip.

**Why this priority**: The regeneration itself is a straightforward, mechanical bulk operation once paced
correctly, but it is sequenced after US2 because auditioning and re-approving 217 clips by ear is
impractical without an admin surface, and the single-synthesis-path guarantee is the mechanism that makes
this fix permanent rather than a one-time cleanup that could quietly recur.

**Independent Test**: Can be verified by (a) confirming the full English coach fleet's audio was generated
after the model upgrade and is re-approved, (b) confirming the lesson fleet was separately checked (not
regenerated) and found current, and (c) a regression test that fails if any code path attempts to
synthesize speech without the current voice configuration, or with a model that cannot honor a voice-style
instruction.

**Acceptance Scenarios**:

1. **Given** the ~217 English coach clips generated before the model upgrade, **When** the regeneration
   pass runs, **Then** every one of them is resynthesized on the current model and carries the current
   voice-style instructions, and their generation timestamps confirm this.
2. **Given** the freshly regenerated coach fleet, **When** the owner reviews it via the admin surface,
   **Then** all 217 clips are re-approved and none is left in an unreviewed state.
3. **Given** the coach-fleet regeneration running through `generate-all scope:'all'` (a single server-side
   request with no per-IP rate-limiter exposure), **When** any individual clip within that run fails,
   **Then** the run reports clearly which clips failed rather than crashing on an unexpected response
   format (FR-024); separately, **given** the lesson-audio tool (FR-031) making well over a hundred
   requests against the shared, rate-limited per-lesson endpoint, **when** it runs, **then** it paces
   itself so it does not trip the shared rate limit, and if it is ever rate-limited it retries — honoring
   `RateLimit-Reset` and handling the limiter's plain-text 429 body — rather than failing with an
   unreadable error.
4. **Given** the lesson audio fleet (already rewritten in a recent content pass), **When** its currency is
   checked against the model-upgrade date, **Then** the result is recorded as an explicit confirmation, not
   a new regeneration.
5. **Given** any of the three places in the codebase capable of triggering speech synthesis today, **When**
   any one of them is invoked, **Then** all three produce audio using the same current voice model and the
   same non-empty voice-style instructions — none of them can silently omit the instructions or use a
   different model.
6. **Given** a request to synthesize speech using a legacy model that cannot honor voice-style instructions,
   **When** that request is attempted through the shared synthesis path, **Then** it is refused rather than
   silently producing an unstyled clip.
7. **Given** the guarantee in scenarios 5 and 6, **When** the regression test for it runs, **Then** it
   fails if a future change reintroduces a caller that omits the instructions or accepts a legacy model.

---

### Edge Cases

- A lesson has no Socratic board at all (its Socratic section is entirely absent) — the coverage
  verification and the admin Lessons section must handle this without erroring, simply showing/counting
  nothing for that lesson's Socratic messages.
- A slide's prose is authored only in one language (Spanish only, or English only) — the coverage check and
  admin listing must still surface it correctly for the language that has content, and must not require the
  other language's text to exist.
- A message's text is empty or whitespace-only — this is "nothing to say," not a missing clip, and must not
  be flagged as a coverage failure or trigger generation.
- Two different pieces of narration text happen to be identical strings — they intentionally share one
  audio file; this must not be mistaken for a missing or duplicate-clip problem by any of the new tooling.
- The admin server was started before a lesson file was edited on disk and is holding a stale in-memory
  copy — any admin action that regenerates or reports on lesson audio must not silently write the stale
  copy back over a newer on-disk edit.
- A bulk regeneration run is interrupted partway (network failure, process killed) — it must be resumable
  or at minimum clearly report which items succeeded and which remain, never leave silent gaps.
- The blunder one-liner locale-threading change (US4) must not change behavior for any caller that already
  worked correctly in English.

## Requirements *(mandatory)*

### Functional Requirements

**Verification (US1)**

- **FR-001**: The system MUST provide an automated test that, for every lesson on disk, enumerates every
  narratable message via the single production message-walker (`collectMessages()` in
  `connect-four/server/lessonAudio.js`) — never a hand-maintained list of field names — and asserts that
  each message has a populated audio-path field for each language it has text in, and that the file the
  path points to exists on disk.
- **FR-002**: The system MUST support running the existing lesson-audio orphan-pruning operation and
  reporting the count of files deleted; as of this epic's baseline that count MUST be zero, and this
  becomes a standing regression check.
- **FR-003**: The verification process MUST be satisfied by (a) the structural checks in FR-001/FR-002
  plus (b) a recorded sign-off, in `staging_checks.md`, that at least one Spanish lesson clip and one
  Spanish coach clip were listened to in the running application served from the frontend dev port (never
  the API port, which does not serve static audio) and confirmed by ear to be genuine, intelligible Spanish
  audio rather than an English clip served under Spanish text. This is not an ownerless blocking gate on
  this story or on US5: it is deferred to the staging sign-off pass (see `staging_checks.md`,
  "Epic 5 — Audio Verification & TTS Management").
- **FR-004**: The system MUST provide an automated test that exercises the Socratic exercise screen twice
  — once without ever triggering the Hint control, and once with Hint triggered at least once — and asserts
  programmatically (audio-element playback state) that narration plays and stops correctly on navigation in
  both runs; a single combined pass is not sufficient because triggering Hint prevents some phases from
  ever narrating (a separate, known defect). This check is structural/automated, stays in-story, and stays
  blocking.
- **FR-005**: The verification process MUST be satisfied by a recorded sign-off, in `staging_checks.md`,
  of an accent-quality audit of a sample of Spanish clips (both coach and lesson) — confirming a native
  Buenos Aires/Rioplatense (voseo) speaker, not an English speaker reading Spanish phonetically. This is
  not an ownerless blocking gate on this story or on US5: it is deferred to the staging sign-off pass.
- **FR-006**: The verification process MUST determine, with evidence (not an inference from a content-pass
  date), whether the lesson audio fleet was generated on the current voice model — the result feeds the
  scope decision in US5 (confirm vs. regenerate).
- **FR-007**: Upon completion of the checks above, the two verify-and-close issues (audio for the fully
  translated lesson set; the Spanish coach clip fleet) MUST each be closed out in the project's open-issues
  log per that log's closeout convention, with the evidence produced by this story's checks.

**Lesson audio admin surface (US2)**

- **FR-008**: The system MUST add a section to the existing coach-audio admin page
  (`connect-four/src/pages/AdminAudioPage.jsx`) that lists every lesson's narratable messages
  (concept-slide coach messages, concept-slide prose, and Socratic-phase messages), grouped in a way that
  is navigable per lesson.
- **FR-009**: For each listed message, status (has-audio / missing) MUST be computed live from the current
  lesson content every time it is displayed. The system MUST NOT introduce any second stored record (a
  registry, index, or cache of "what's been generated") for lesson audio — lesson content on disk remains
  the sole source of truth, matching the existing registry-free design of the lesson audio pipeline.
- **FR-010**: The admin Lessons section MUST let an owner play any listed message's existing clip inline,
  without leaving the admin page.
- **FR-011**: The admin Lessons section MUST let an owner trigger (re)generation for a single message
  independently of any other message.
- **FR-012**: The admin Lessons section MUST respect the same language toggle already present on the
  page, showing/generating the selected language's text and audio.
- **FR-013**: Adding the Lessons section MUST NOT change the behavior of the page's pre-existing
  coach-audio status list, config editor, or preview sandbox — with one explicit, intended exception:
  FR-028's removal of the legacy `tts-1`/`tts-1-hd` models from the config editor's and preview sandbox's
  model dropdowns. That change to the config editor and preview sandbox is required, not prohibited; every
  other pre-existing behavior of those three regions is unchanged.
- **FR-014**: The addition MUST be documented in the project's lesson-editor reference documentation
  (`docs/architecture/lesson-editor.md`).

**Correctness fixes (US3)**

- **FR-015**: When an owner triggers regeneration, from the admin surface, of a coach clip that is already
  approved, the system MUST present an explicit warning that the action will publish a new, unreviewed
  recording immediately, before the regeneration proceeds. This MUST NOT become an approval gate — a
  regenerated clip still publishes immediately once the owner proceeds; the fix is disclosure, not a new
  restriction.
- **FR-016**: The admin cleanup operation that expires cached explanation audio MUST scope its update to
  the specific language of the row being expired, so a different language's cached row for the same
  position is never affected by another language's cleanup.
- **FR-017**: The deep-reveal narration endpoint MUST accept a syntactically valid but empty move sequence
  (the opening move of a game) as a legitimate input rather than rejecting it as missing.
- **FR-018**: Each of FR-015, FR-016, and FR-017 MUST have an independent automated regression test that
  fails against the pre-fix behavior.

**Blunder one-liner localization (US4)**

- **FR-019**: The system MUST determine the requesting learner's locale at the point where the blunder
  one-liner is generated (today this pipeline has no locale context of any kind reaching it).
- **FR-020**: The blunder one-liner generation MUST honor that locale, producing Spanish text for a
  Spanish-locale learner and English text for an English-locale learner.
- **FR-021**: The system MUST document the **owner-ratified decision** (not a spec-author default) on
  already-cached English-language one-liners: they are **not** backfilled into the target language; each
  is naturally replaced the next time that position's explanation is regenerated for a Spanish-locale
  learner (see Assumptions for the recorded escalation trigger).

**Stale fleet regeneration & single synthesis path (US5)**

- **FR-022**: The system MUST regenerate every English coach clip that was synthesized before the app's
  voice-model upgrade, producing new audio on the current model with the current voice-style instructions
  applied, using the existing `POST /api/admin/audio/generate-all` endpoint with `scope: 'all'` — the
  admin surface already re-synthesizes every eligible key server-side, inside one HTTP request, with no
  exposure to the per-IP rate limiter. This requirement needs **no new tooling**. **Sequencing
  constraint**: this MUST NOT run until FR-026 and FR-027 (the single synthesis path and its
  language-correct instructions) have landed — regenerating today, through the still-defective CLI path,
  would produce 217 fresh but still-unstyled clips.
- **FR-023**: The system MUST provide a way to re-approve the full regenerated coach fleet via the admin
  surface, and every regenerated clip MUST end this story in an approved state.
- **FR-024**: The coach-fleet regeneration (FR-022) MUST report clearly which of the 217 clips failed
  rather than crashing on an unexpected response format; because `generate-all scope:'all'` already runs
  server-side inside one HTTP request with no per-IP rate-limiter exposure, no client-side request pacing
  or retry is required for this requirement. (Pacing, retry-on-429, and non-JSON-429-body handling against
  the shared rate limiter are the lesson-audio tool's concern — see FR-031, which faces that limiter
  because its target endpoint is per-lesson, per-language.)
- **FR-025**: The lesson audio fleet MUST be explicitly confirmed current against the model-upgrade date
  (building on FR-006) rather than regenerated, unless FR-006 finds it is in fact stale, in which case it
  MUST be regenerated too.
- **FR-026**: The shared synthesis entry point (`synthesize()`/`buildTtsRequest()` in
  `connect-four/server/ttsProvider.js`, already the only file in the codebase that talks to the TTS
  provider directly, and already the path every caller — `connect-four/server/index.js`'s coach
  single/bulk/preview generation, `connect-four/server/lessonAudio.js`'s lesson generation, and
  `connect-four/scripts/generate-tts.js`'s CLI — imports) MUST resolve voice model, voice, speed, and
  instructions **internally from the requested language**. Callers MUST supply only text and a language;
  the entry point's signature MUST make it impossible for a caller to supply or omit model, voice, or
  instructions — omission must be inexpressible, not merely unused. This is not a call-site consolidation
  (the consolidation already exists) — it is closing the gap that lets a caller pass through the shared
  function without full per-language config, which is exactly how `generate-tts.js` currently ships
  unstyled clips (see FR-027).
- **FR-027**: The single synthesis path MUST always apply the **requested language's** configured voice
  model, voice, speed, and a non-empty, **that-language's** voice-style instruction string (e.g. the
  Spanish persona from `server/tts-prompt.es.json` plus its accent directive from
  `buildTtsInstructions(prompt, lang)` — not the English persona applied to Spanish text); no caller may
  bypass, omit, or override the instructions into an unstyled or wrong-language request. This closes a
  verified, currently-live gap: today `connect-four/scripts/generate-tts.js:363-366`'s
  `synthesizeAndWrite()` calls `synthesize(value)` with no options at all, so every clip the CLI
  generates — in any language, past and present — ships with the hardcoded default voice (`alloy`) and no
  voice-style instructions whatsoever, and its `lang` argument never reaches synthesis at all. A fix that
  merely supplies *some* non-empty instructions, without tying them to the requested language, would
  satisfy a weaker reading of this requirement while still giving a Spanish CLI clip an English persona —
  FR-026's signature change is what forecloses that outcome. Preserve the existing *injectable*
  `synthesize` seam in `lessonAudio.js` — `generateLessonAudio`'s `synthesize` parameter, defaulting to
  the shared entry point, must remain swappable for a test stub — regardless of where config resolution
  (`readTtsConfig(lang)`) itself ends up living after FR-026's signature change moves it inside
  `ttsProvider.js`. (This parenthetical previously said "reading `readTtsConfig(lang)`", which
  contradicted FR-026's own design once `readTtsConfig` moved into `ttsProvider.js`; the seam being
  preserved is the injection point, not the config-resolution call.)
- **FR-028**: The single synthesis path MUST refuse to synthesize using a model that is known not to honor
  voice-style instructions (the legacy `tts-1`/`tts-1-hd` models the app has already moved away from as its
  default), rather than silently accepting the request and producing an unstyled clip. These models MUST
  also be removed from every selectable set in the codebase — `VALID_TTS_MODELS` in
  `connect-four/server/ttsConfig.mjs`, and the `TTS_MODELS` dropdown in
  `connect-four/src/pages/AdminAudioPage.jsx` (both the config editor and the preview sandbox) — so an
  unsynthesizable configuration can never be saved in the first place, not merely rejected at synthesis
  time (see the FR-013 carve-out).
- **FR-029**: There MUST be an automated regression test at the synthesis seam asserting that every
  synthesis request carries the current voice model and non-empty, language-correct instructions, so a
  future change that reintroduces a bypassing caller is caught automatically rather than relying on manual
  review.
- **FR-031**: Separately from FR-022 (which needs no new tooling), the system MUST provide a paced,
  rate-limit-aware CLI tool, `connect-four/scripts/generate-lesson-audio.mjs`, for corpus-wide **lesson**
  audio regeneration — the actual OI-78 deliverable. Today the lesson admin path is per-lesson,
  per-language (`POST /api/admin/lessons/:id/generate-audio`), so a full corpus pass is 15 × 2 = 30
  separate HTTP requests against the shared 120 req/min limiter, which OI-78 shows fails 9 of 15 lessons
  instantly and identically once tripped. The tool MUST support `--lesson`/`--lang` selection, pace its
  requests to avoid tripping the shared limiter, retry honoring `RateLimit-Reset` on a 429, handle the
  limiter's plain-text (non-JSON) 429 body without crashing, and provide a real `--help` (purpose, options,
  defaults, exit 0 before required-arg validation). This does not add a bulk re-synthesize-approved
  command to the existing CLI (`--sync`/`--key`/`--all-new`/`--reset`/`--lang`/`--yes`) — that capability
  remains solely in the admin `generate-all scope:'all'` endpoint used by FR-022.

**Issue closeout (all stories)**

- **FR-030**: Every open-issue entry this epic covers (OI-23, OI-26, OI-27, OI-28, OI-32, OI-42, OI-45,
  OI-65, OI-78) — plus OI-9, OI-43, and OI-64, which the epic notes as subsumed by OI-65 but which still
  exist as live entries in `docs/open_issues.md` and would otherwise read as stale after this epic ships —
  MUST be closed out in `docs/open_issues.md`, in the same change that ships the
  corresponding work, per that log's closeout convention: fully fixed entries are marked resolved with the
  date and a description of what shipped and where; partially fixed entries stay open with a dated note on
  exactly what remains; entries found already resolved are marked so with the evidence; and entries
  deliberately left unfixed stay open with the reasoning recorded.

### Key Entities

- **Lesson message**: a single unit of narratable text within a lesson — a concept-slide coach message, a
  concept-slide's prose paragraph, or a Socratic-phase message — each carrying its own English text/audio
  pair and, where translated, a Spanish sibling pair.
- **Coach clip**: a single spoken-audio recording for one coach dialogue key, tracked through an approval
  workflow (needs audio / awaiting approval / approved / ineligible) per language, independent of lesson
  messages.
- **Voice configuration**: the current model, voice, speed, and voice-style instruction text used for
  synthesis, held per language, and the thing that silently stops applying to previously-generated clips
  once the underlying text hasn't changed.
- **Open-issue entry**: a tracked, numbered defect/gap record in the project's open-issues log, each with a
  lifecycle state (open, partially fixed, resolved, deliberately not fixed) that this epic's stories must
  update as they close work out.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of narratable lesson messages across all 15 lessons have a verified, playable audio
  file for every language they have text in — verified by an automated check, not by inspection.
- **SC-002**: Running the lesson-audio cleanup process reports zero orphaned files removed.
- **SC-003**: A Spanish-speaking learner never hears English-accented or English-language audio anywhere
  a Spanish clip is expected — confirmed by direct listening, not by field-presence alone.
- **SC-004**: An owner can locate, listen to, and regenerate any single clip in the entire app — coach or
  lesson, either language — without leaving one admin page.
- **SC-005**: 100% of the previously stale English coach clips (currently ~217) are regenerated on the
  current voice model and re-approved.
- **SC-006**: Zero code paths in the system can produce a spoken clip that omits the configured voice style
  or uses a model unable to honor it — enforced by an automated test, not a manual review checklist.
- **SC-007**: A learner's first-move mistake explanation is audible, with no silent audio failure on the
  opening move of a game.
- **SC-008**: A Spanish-speaking learner sees mistake one-liners in Spanish for newly generated
  explanations, on whichever server response actually renders the one-liner the learner reads in the
  running app today — this is **not** presumed to be `composeExplanation`/`POST /api/explain-move`; a
  discovery task (see US4's plan/tasks) confirms the live path with a captured network request before
  any implementation targets it. If discovery finds no code path currently renders a one-liner in the
  app, this criterion is satisfied by whatever re-scoped or deferred outcome that discovery produces,
  not by localizing dead code.
- **SC-009**: Every open-issue entry this epic covers has an accurate, dated status in the open-issues log
  reflecting exactly what shipped, by the end of this epic.

## Assumptions

- **Scope boundary**: no new lesson text is translated and no lesson content is edited by this epic — all
  15 lessons are already fully translated; this epic is audio-and-tooling only, plus the three named
  correctness fixes (US3) and the separate one-liner localization fix (US4).
- **No vendor or caching-scheme change**: the text-to-speech vendor and the identical-text-shares-one-file
  caching scheme are unchanged; this epic works within those constraints, not around them.
- **Publish-immediately stays the model for approval**: a regenerated clip at an already-approved slot
  continues to go live immediately upon regeneration, not gated behind re-approval; the fix here is adding
  an explicit warning before that happens, not changing the underlying publish behavior. Gating playback
  behind approval was considered and rejected, because it can take a currently-working clip offline the
  moment someone clicks regenerate.
- **Lesson audio has no second source of truth**: status is always derived live from lesson content;
  adding any stored registry/index for lesson audio would contradict this epic's design and is out of
  scope.
- **Already-cached English one-liners**: **owner-ratified decision** (not a spec-author default) —
  already-cached English-language blunder one-liners are **not** backfilled into Spanish automatically;
  they naturally get replaced the next time that same position's explanation is regenerated for a
  Spanish-locale learner. **Escalation trigger**: if the by-ear verification (see `staging_checks.md`,
  Epic 5 section) shows Spanish learners hitting English one-liners frequently in normal play, escalate to
  purging the English rows outright — that reversal is cheap and needs no new tooling. Absent that signal,
  this decision stands as recorded (per FR-021), not silently revisited.
- **Generation environment**: bulk regeneration work in this epic runs from a local development environment
  with the necessary provider credentials configured; it is not expected to run from a remote/cloud
  execution environment that lacks those credentials.
- **This epic depends on no other in-flight epic.** It is independent of the lesson-content epic that
  follows it in the same delivery lane; that epic depends on this one's audio being correct, not the other
  way around.
