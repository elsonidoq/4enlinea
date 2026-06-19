# Feature Specification: Audio & Interactive Coach

**Feature Branch**: `039-audio-interactive-coach`
**Created**: 2026-06-18
**Status**: Draft
**Input**: Epic 10 — Audio & Interactive Coach (TODOs_epics.md)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Sound feedback during gameplay (Priority: P1)

A player drops a disc and hears an impact sound that matches the physics: a whoosh as the disc falls, then a distinct thud depending on whether it lands on the board bottom or on another disc. When the player wins, they hear a short celebration fanfare. When solving a puzzle correctly they hear a positive chime; when making a wrong move, a soft negative sound.

**Why this priority**: Sound feedback is the most universally expected sensory layer for a disc-drop game. It makes the interaction feel tactile and rewarding without requiring any configuration.

**Independent Test**: With audio enabled, play a game and drop several discs — each drop triggers an audible impact. Win a game — celebration plays. Get a puzzle wrong — negative sound plays. All independently testable without TTS or KB features.

**Acceptance Scenarios**:

1. **Given** the user drops a disc into an empty column, **When** the disc animation completes, **Then** a "hits board bottom" sound plays.
2. **Given** the user drops a disc into a column that already has discs, **When** the disc animation completes, **Then** a "disc on disc" sound plays.
3. **Given** the user answers a puzzle correctly, **When** the correct answer is confirmed, **Then** a positive chime plays.
4. **Given** the user makes an incorrect move, **When** the system flags the error, **Then** a soft negative sound plays.
5. **Given** the user wins a game, **When** the win state is reached, **Then** a celebration fanfare plays.
6. **Given** the user has muted SFX, **When** any of the above events occur, **Then** no sound plays.

---

### User Story 2 — Background music during play (Priority: P2)

Background music plays softly while a game session is active. The user can mute or unmute music independently of sound effects. The preference is remembered across sessions.

**Why this priority**: Ambient music creates atmosphere and improves perceived app quality. The independent mute toggle is important because some users want SFX without music.

**Independent Test**: Launch a game session — music starts. Mute music — it stops. Reload the app — mute preference is preserved. Sound effects still trigger. Testable without TTS or KB features.

**Acceptance Scenarios**:

1. **Given** the user starts a game, **When** the game screen appears, **Then** background music begins playing in a loop.
2. **Given** music is playing, **When** the user toggles the music mute control, **Then** music stops immediately and the preference is saved.
3. **Given** the user previously muted music, **When** the app is reloaded and a game is started, **Then** music does not play.
4. **Given** music is muted, **When** the user unmutes, **Then** music resumes from where it was or from the beginning.

---

### User Story 3 — Comfortable coach pacing (Priority: P3)

After the coach shows commentary about the player's move, there is a noticeable pause before the AI plays its disc and the follow-up coaching message appears. Both messages are readable before the conversation advances.

**Why this priority**: Today the gap is too short — the AI response arrives before the user has time to read the player-move commentary. This is a perceived quality issue that affects every sparring and challenge session.

**Independent Test**: Play a sparring game — observe the time gap between the player-move coach bubble and the AI-move coach bubble. Both should be comfortably readable. Testable without any audio or KB features.

**Acceptance Scenarios**:

1. **Given** the user makes a move in a sparring game, **When** the player-move coach message appears, **Then** a perceptible pause (at least one second) occurs before the AI disc placement and the AI coach message.
2. **Given** the same scenario in a challenge puzzle, **When** the player-move message appears, **Then** the same pause applies before the next stage of commentary.

---

### User Story 4 — Spoken coach messages (Priority: P4)

The player can enable speech so the coach reads its messages aloud. Each static coach message has a pre-recorded voice. The toggle is independent of SFX and music. The preference persists.

**Why this priority**: Reading on a small screen while also tracking the board is hard. Speech lets the user absorb coaching without taking their eyes off the board.

**Independent Test**: Enable speech toggle — coach messages are read aloud as they appear. Disable — silence. Testable without KB term feature.

**Acceptance Scenarios**:

1. **Given** speech is enabled, **When** a coach message appears on screen, **Then** the message is read aloud.
2. **Given** speech is disabled, **When** a coach message appears, **Then** no audio plays for that message.
3. **Given** the user toggles speech off mid-session, **When** a new coach message appears, **Then** it is not read aloud.
4. **Given** a coach message contains runtime-substituted values (e.g. a count), **When** that message appears, **Then** it plays silently (no audio pre-generated for interpolated strings).
5. **Given** speech is enabled and a message plays, **When** the next message appears before the first finishes, **Then** playback does not overlap (new message interrupts or queues).

---

### User Story 5 — Tappable KB terms in deep reveal (Priority: P5)

When the user opens a deep reveal explanation, certain tactical terms appear visually highlighted differently from zone references. Tapping a highlighted term shows a popup with a short (1–2 sentence) definition. If a lesson or practice exists for that concept, the popup also shows a call-to-action to go there.

**Why this priority**: Deep reveal explanations contain jargon that beginners don't know. In-context definitions turn the explanation into a learning moment without leaving the screen.

**Independent Test**: Open a deep reveal for a position involving a known tactical pattern (e.g. Z-threat). The term "Z-threat" appears highlighted. Tap it — popup shows definition and lesson link. Testable without TTS or other audio features.

**Acceptance Scenarios**:

1. **Given** a deep reveal explanation contains a recognized KB term, **When** the text is displayed, **Then** the term appears with distinct visual styling (different from zone reference highlighting).
2. **Given** the user taps a highlighted term, **When** the popup appears, **Then** it shows a 1–2 sentence concept summary.
3. **Given** a lesson exists for the tapped concept and the user has not completed it, **When** the popup appears, **Then** a "Go to lesson" CTA is shown.
4. **Given** a lesson exists for the tapped concept and the user has completed it, **When** the popup appears, **Then** a "Go to practice" CTA is shown.
5. **Given** no lesson or practice exists for a concept, **When** the popup appears, **Then** no CTA is shown — only the definition.
6. **Given** a deep reveal explanation contains zone references (board highlights) alongside term references, **When** displayed, **Then** zone references trigger board highlight toggling as before; term references open the popup — the two behaviors do not interfere.

---

### User Story 6 — TTS audio content management (Priority: P6, localhost admin only)

A developer running the app locally can open an admin page to see which coach i18n keys have approved audio, generate audio for new or specific keys, listen to generated audio, and approve it. Approved audio is committed to the repository.

**Why this priority**: Without this tooling, adding new coach messages would require a separate out-of-band process. This closes the loop so audio stays current as new messages are added.

**Independent Test**: Run locally, open `/admin/audio`. New coach keys with no audio appear listed. Click generate for one key — audio is synthesized. Play it back — audio matches the text. Click approve. Restart the app and enable speech — the approved message plays.

**Acceptance Scenarios**:

1. **Given** a new i18n key has been added and has no audio file, **When** the developer opens the admin audio page, **Then** the new key is listed as "needs audio."
2. **Given** the developer clicks "Generate" for a key, **When** synthesis completes, **Then** the audio is saved locally and the key moves to "awaiting approval."
3. **Given** audio exists for a key, **When** the developer plays it back, **Then** the coach voice is heard.
4. **Given** the developer approves a key, **When** the registry is updated, **Then** the key is marked approved and the app can play it when speech is enabled.
5. **Given** a key's i18n string contains `{{...}}` placeholders, **When** viewing the admin page, **Then** that key is listed as ineligible for TTS and cannot be generated.

---

### Edge Cases

- What happens when an audio file is missing at runtime (deleted after deployment)? System falls back to silent — no playback error shown to user.
- What happens when the device has no audio capability? All audio features are silently disabled; no UI change except controls remain (muted state).
- What happens when the user rapidly drops discs faster than the impact sounds complete? Each sound plays briefly; overlapping sounds are acceptable.
- What happens when a KB term appears multiple times in the same deep reveal? Each occurrence is independently tappable with the same popup.
- What happens when a KB term has no `short_summary` yet? The term is not highlighted in deep reveal until the summary is populated.

---

## Requirements *(mandatory)*

### Functional Requirements

**Sound effects:**
- **FR-001**: The system MUST play a distinct audio cue when a disc animation completes — one cue for landing on the board bottom, a different cue for landing on another disc.
- **FR-002**: The system MUST play a positive chime when the user answers a puzzle correctly.
- **FR-003**: The system MUST play a soft negative sound when the user makes an incorrect move.
- **FR-004**: The system MUST play a celebration sound when the user wins a game.
- **FR-005**: The system MUST play background music in a loop during active game sessions.
- **FR-006**: The system MUST provide a mute control for SFX (disc sounds, win, correct, wrong) independently of music.
- **FR-007**: The system MUST provide a mute control for background music independently of SFX.
- **FR-008**: Mute preferences MUST persist across app reloads.

**Spoken coach:**
- **FR-009**: The system MUST provide a speech toggle that, when enabled, reads each coach message aloud as it appears.
- **FR-010**: The speech toggle MUST be independent of the SFX and music mute controls.
- **FR-011**: The speech preference MUST persist across app reloads.
- **FR-012**: Only coach messages with static, non-interpolated text MUST have audio available. Coach messages containing runtime-substituted values MUST be silently skipped.
- **FR-013**: If a new coach message arrives before the current one finishes speaking, playback of the current message MUST be interrupted and the new one begun (or queued — single active utterance at a time).

**Coach pacing:**
- **FR-014**: After the player-move coach message appears in a sparring game, the system MUST wait at least 1200ms before the AI disc placement and the AI coach message. *(Implementation note: the relevant delay lives in `useGameBoard.js` around line 348.)*
- **FR-015**: The same pacing delay MUST apply in challenge puzzle surfaces where the coach sequences messages. *(Implementation note: `ChallengeScreen.jsx` does NOT use `useGameBoard` — it pushes coach messages to state directly with no existing pacing timer. The `setTimeout(..., 300)` near line 430 is disc-animation settle time, not coach pacing. FR-015 requires **new code**: after the user-move coach message is pushed to state, wait `COACH_PACING_MS` before pushing the AI-move coach message. Both files must be updated independently or FR-015 will be silently missed.)*

**KB term glossary (deep reveal only):**
- **FR-016**: In deep reveal explanations, recognized tactical KB terms MUST be visually distinguished from plain text and from zone-reference spans.
- **FR-017**: Tapping a distinguished term MUST display a popup with a 1–2 sentence summary of the concept.
- **FR-018**: If a lesson exists for the concept and the user has not completed it, the popup MUST include a "Go to lesson" call-to-action.
- **FR-019**: If a lesson exists for the concept and the user has completed it, the popup MUST include a "Go to practice" call-to-action.
- **FR-020**: If no lesson or practice exists for a concept, the popup MUST show only the definition summary with no CTA.
- **FR-021**: Zone-reference taps (board highlight toggle) MUST NOT be affected by the introduction of term taps. Both interaction types MUST coexist without conflict.
- **FR-022**: A KB term MUST only be highlighted if a short summary exists for it. Terms without a summary MUST appear as plain text.
- **FR-023**: All eligible KB entries that lack a short summary MUST have one added as part of this feature.

**KB term → kbId mapping:**
- **FR-024**: A static `kbId → { lessonId?, practiceCategory? }` lookup table MUST be authored as a JS/JSON constant in the codebase. This table determines which recognized KB terms have a lesson CTA, which have a practice CTA, and which have neither. The lookup MUST be a static constant, not a DB query.
- **FR-025**: The lookup table MUST cover all ~9 KB terms eligible for annotation. Terms with neither a lesson nor a practice category MUST be represented in the table explicitly (so the absence of a CTA is intentional, not an omission).

**explanation_cache integration:**
- **FR-026**: The `/api/explain-move-llm` endpoint MUST persist the `terms` map (shape: `{ kbId: short_summary }`) alongside `explanation` and `prompt` in the `explanation_cache` write path.
- **FR-027**: The endpoint MUST return the persisted `terms` map on cache read/hit paths so that term highlighting works for cached positions.
- **FR-028**: All existing `explanation_cache` rows MUST be cleared as part of deploying this feature. (The app is pre-production; stale entries have no `[term:...]` tags and would never produce term highlighting even after the feature ships. No schema versioning or migration is needed — a one-time truncation at deploy time is sufficient.)

**TTS content management (localhost admin):**
- **FR-029**: An admin page (accessible only at localhost) MUST list all non-interpolated static coach i18n keys grouped by status: approved, awaiting approval, and needs audio.
- **FR-030**: The admin page MUST allow generating audio for one key or all keys lacking audio.
- **FR-031**: The admin page MUST allow playing back generated audio before approval.
- **FR-032**: The admin page MUST allow approving a key, which marks it as approved in the registry.
- **FR-033**: Interpolated i18n keys MUST be surfaced in the admin page as ineligible, not silently hidden.

### Key Entities

- **AudioPreference**: The user's per-category mute state (SFX enabled, music enabled, speech enabled) — persisted locally per device.
- **SFXAsset**: A named audio file for a specific game event (disc_fall, disc_land_disc, disc_land_bottom, bg_music, win, correct_move, wrong_move). Lives in the app's static file tree.
- **CoachAudioFile**: A pre-generated audio file for a specific non-interpolated i18n key. Named by a slug derived from the key. Lives in the app's static file tree.
- **TtsRegistry**: A machine-readable record mapping each coach i18n key to its audio file path and approval state (needs_audio | awaiting_approval | approved | ineligible).
- **KBTermAnnotation**: A parsed representation of a `[term:kbId]` inline tag found in a deep reveal explanation string. The explanation string returned by the LLM contains inline tags such as `[term:community-z-threat]` (the same pattern used for `[zone:...]` tags). These are parsed **client-side** by `parseAnnotatedText` into a `terms` array with shape `{ index, startChar, endChar, kbId, text }`. No character offsets cross the API wire — only the raw explanation string and a flat `terms` map (see below). Zone-reference parsing is unaffected and continues to work as before.
- **KBTermsMap**: The `terms` field in the `/api/explain-move-llm` API response. Shape: `{ [kbId]: short_summary }`. Contains one entry per distinct KB term referenced in the explanation. The `short_summary` is a 1–2 sentence plain-language definition sourced from the KB entry's `short_summary` field — **not** the full `statement`. The `statement` is injected into the LLM prompt as context only and never returned to the client. This map is persisted in `explanation_cache` alongside `explanation` and `prompt`.
- **KbTermLesson**: A static JS/JSON constant (not a DB table) mapping `kbId → { lessonId?: string, practiceCategory?: string }`. Covers all ~9 KB terms eligible for annotation. Terms with no lesson or practice are represented explicitly with both fields absent. Used by the term popup to determine which CTA (if any) to render. The `lessonId` corresponds to an existing lesson screen; `practiceCategory` corresponds to a puzzle category the user can practice.
- **KBTermShortSummary**: The `short_summary` field on a KB `.md` entry — a 1–2 sentence plain-language definition of the concept. A term MUST have a populated `short_summary` to be eligible for annotation. All eligible KB entries must have this field populated as part of this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 7 SFX events (disc fall, disc-on-disc, disc-on-bottom, win, correct, wrong, and music) play correctly for 100% of triggered occurrences when audio is enabled.
- **SC-002**: Mute/unmute preferences for all three audio categories (SFX, music, speech) survive app reload with no reversion.
- **SC-003**: The time gap between player-move coach message and AI coach message is no shorter than 1200ms in every sparring and challenge session.
- **SC-004**: All non-interpolated coach i18n keys have approved audio in the TtsRegistry before the feature ships.
- **SC-005**: Every KB entry eligible for deep-reveal term annotation has a `short_summary` field populated before the feature ships.
- **SC-006**: Tapping a KB term in a deep reveal shows the correct definition popup within one interaction with no navigation away from the explanation.
- **SC-007**: The admin audio page correctly surfaces every newly added non-interpolated i18n coach key as "needs audio" with no developer manual intervention.

## Assumptions

- Sound assets (SFX and music files) are sourced externally by the developer from CC0/royalty-free libraries. A single placeholder file is used for all asset slots during development and wiring.
- The placeholder file for all sounds is located at `~/Downloads/zapsplat_leisure_game_connect_4_disc_drop_into_grid_tower_game_play_single_008_52315.mp3` and must be copied to each expected asset path to unblock implementation.
- TTS voice selection (among available OpenAI voices) is a judgment call made during audio QA, not a product requirement.
- Background music looping behavior is an implementation detail; either native HTML audio looping or a Web Audio API approach is acceptable.
- The admin audio page is accessible at localhost only and requires no authentication.
- The TTS service provider is OpenAI (`tts-1` model). The interface is designed to be provider-agnostic so the provider can be swapped without changing call sites.
- Spoken deep-reveal narration (reading the explanation text aloud) is explicitly out of scope. Only static coach dialog messages have TTS.
- Eligible KB terms for deep-reveal annotation are those that have both a file-backed KB entry (a `.md` file in `docs/knowledge-base/`) and a populated `short_summary`. Terms with only inline definitions are not eligible.
- Lesson completion state is read from the existing lesson progress store.
- The lesson/practice CTA in the term popup links to the lesson or practice screen for the concept; if no such screen exists for a concept, no CTA is shown.
- `forced_win` is explicitly and permanently excluded from KB term annotation. No `derived-lost-position.md` KB entry needs to be created as part of this feature. Deep reveal explanations for `forced_win` positions will never show term highlights for that concept.
