# Tasks: Audio & Interactive Coach (Epic 10)

**Input**: Design documents from `specs/039-audio-interactive-coach/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, research.md ✓, contracts/api-admin-audio.md ✓

**No tests requested** — manual QA on golden paths per plan.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- Exact file paths in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Audio directories, placeholder assets, and shared constants in place before any wiring begins.

- [x] T001 Create `connect-four/public/audio/sfx/` and `connect-four/public/audio/coach/` directories; copy placeholder MP3 (`~/Downloads/zapsplat_leisure_game_connect_4_disc_drop_into_grid_tower_game_play_single_008_52315.mp3`) to each of the 7 SFX paths: `disc_fall.mp3`, `disc_land_disc.mp3`, `disc_land_bottom.mp3`, `bg_music.mp3`, `win.mp3`, `correct_move.mp3`, `wrong_move.mp3`
- [x] T002 [P] Create `connect-four/src/lib/constants.js` exporting `COACH_PACING_MS = 1200` and a `delay(ms)` helper (if not already present elsewhere)
- [x] T003 [P] Add `short_summary` field to all 9 eligible KB entries in `docs/knowledge-base/`: `community-z-threat.md`, `community-figure-7.md`, `community-overcut.md`, `allen-j-configuration.md`, `allen-t2.md`, `allis-claimeven.md`, `allis-baseclaim.md`, `allis-before.md`, `allis-specialbefore.md` — 1–2 plain-language sentences per entry, added to YAML frontmatter as `short_summary: |`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks and KB summaries that multiple user stories depend on.

**⚠️ CRITICAL**: US1–US4 cannot be wired until `useAudio.js` is complete. US5 cannot be fully wired until T003 is complete.

- [x] T004 Implement `connect-four/src/lib/useAudio.js` — expose: `playSfx(name)` (plays `public/audio/sfx/<name>.mp3`), `playMusic()`/`pauseMusic()` (module-level singleton `<audio loop>` for `bg_music.mp3`), `sfxEnabled`/`musicEnabled`/`speechEnabled` state (from `localStorage`), `toggleSfx()`/`toggleMusic()`/`toggleSpeech()` (persist to `localStorage`). Defaults: `sfxEnabled=true`, `musicEnabled=true`, `speechEnabled=false`. Components MUST NOT read `localStorage` directly.

**Checkpoint**: T001–T004 complete → all user story phases can begin.

---

## Phase 3: User Story 1 — Sound Feedback During Gameplay (Priority: P1) 🎯 MVP

**Goal**: Every disc drop, win, correct answer, and wrong answer triggers the appropriate sound. SFX mute persists.

**Independent Test**: With `sfxEnabled=true`, play a sparring game — each disc drop triggers an impact sound. Win — fanfare plays. Open a challenge, answer correctly — chime plays. Answer wrong — negative sound plays. Mute SFX — all go silent. Reload — mute preserved.

- [x] T005 [US1] Wire disc SFX and win sound in `connect-four/src/screens/GameScreen.jsx`: import `useAudio`; call `playSfx('disc_fall')` on column click (before animation); on `lastDrop` change, check pre-move column height to call `playSfx('disc_land_disc')` (column was non-empty) or `playSfx('disc_land_bottom')` (column was empty); call `playSfx('win')` when `gameOver.result === 'win'`
- [x] T006 [US1] Wire puzzle SFX in `connect-four/src/screens/ChallengeScreen.jsx`: call `playSfx('correct_move')` on correct answer confirmed; call `playSfx('wrong_move')` on incorrect answer flagged
- [x] T007 [US1] Add SFX mute toggle button to game UI: render a small icon button calling `toggleSfx()` in both `GameScreen.jsx` and `ChallengeScreen.jsx` (stub placement: adjacent to resign/exit button for now)

**Checkpoint**: User Story 1 fully functional — disc sounds, win, correct, wrong all play and respect the SFX mute toggle.

---

## Phase 4: User Story 2 — Background Music During Play (Priority: P2)

**Goal**: Ambient music loops during game sessions. Music mute persists independently of SFX.

**Independent Test**: Start a sparring game — music starts. Mute music — stops immediately. Reload — muted. SFX still plays. Unmute — music resumes.

- [x] T008 [US2] Wire background music lifecycle in `connect-four/src/screens/GameScreen.jsx`: call `playMusic()` in a `useEffect` on mount; call `pauseMusic()` on unmount
- [x] T009 [US2] Wire background music lifecycle in `connect-four/src/screens/ChallengeScreen.jsx`: same `playMusic`/`pauseMusic` mount/unmount pattern
- [x] T010 [US2] Add music mute toggle button to `GameScreen.jsx` and `ChallengeScreen.jsx` alongside the SFX toggle from T007 (calls `toggleMusic()`)

**Checkpoint**: User Story 2 functional — music plays on both sparring and challenge screens, independent mute toggle works.

---

## Phase 5: User Story 3 — Comfortable Coach Pacing (Priority: P3)

**Goal**: 1200ms pause between player-move coach message and AI-move coach message in both sparring and challenge.

**Independent Test**: Play a sparring game — observe a ≥1 s gap between the two coach bubbles. Do the same in a challenge puzzle. Both gaps are readable before the next message.

- [x] T011 [US3] In `connect-four/src/lib/useGameBoard.js`: import `COACH_PACING_MS` from `constants.js`; replace the existing `delay(400)` at line 348 with `delay(COACH_PACING_MS)`
- [x] T012 [US3] In `connect-four/src/screens/ChallengeScreen.jsx`: import `COACH_PACING_MS` from `constants.js`; in the forced_win `continue` branch (around lines 413–438), insert a new `await new Promise(r => setTimeout(r, COACH_PACING_MS))` *after* the user-move coach message is pushed and *before* the AI's continuation move is executed. This ensures the user sees and hears (if speech is enabled) the coach evaluation before the AI responds. The 300ms `setTimeout` at line 430 (disc-animation settle, inside the continue branch) must NOT be changed — the pacing delay comes before it, not instead of it. Scope this task to the forced_win `continue` branch only.

**Checkpoint**: User Story 3 functional — both sparring and challenge sessions have a perceptible ≥1 s coach gap.

---

## Phase 6: User Story 6 — TTS Content Management (Priority: P6, prerequisite for US4)

**Goal**: Developer localhost workflow to generate, listen to, and approve coach audio files. Approved audio committed to repo.

**Independent Test**: Run locally, open `/admin/audio` — new coach keys listed as "needs audio." Click Generate for one key — MP3 file created. Play it back — coach voice heard. Click Approve — key moves to "approved", `coach-audio-manifest.json` updated.

**Note**: This phase must be completed before US4 (spoken coach) can be wired.

- [x] T013 [US6] Create `connect-four/server/ttsProvider.js`: export `synthesize(text, { voice = 'alloy' } = {})` that calls OpenAI TTS API (`tts-1` model), returns `Buffer`. Reads `OPENAI_API_KEY` from env. File is the only place that references OpenAI directly — swapping provider = swapping this file.
- [x] T014 [US6] Create `connect-four/scripts/generate-tts.js`: reads `connect-four/src/i18n/en.json`; flattens all keys; marks keys containing `{{` as ineligible; for eligible keys, calls `ttsProvider.synthesize` with the string value; writes MP3 to `connect-four/public/audio/coach/<slug>.mp3` (slug = key with dots/underscores → `--` hyphens); updates `connect-four/server/tts-registry.json`. CLI flags: `--key <key>` (single key) and `--all-new` (all keys with status `needs_audio`).
- [x] T015 [US6] Initialize `connect-four/server/tts-registry.json` by running the generate script in scan-only mode (or manually): populate all ~221 static keys with `status: "needs_audio"` and all 4 interpolated keys with `status: "ineligible", reason: "interpolated"`; initialize `connect-four/public/audio/coach/coach-audio-manifest.json` as an empty JSON array `[]`
- [x] T016 [US6] Add admin audio endpoints to `connect-four/server/index.js` (all guarded by `requireLocalhost` middleware): `GET /api/admin/audio/status` (reads tts-registry + en.json, returns grouped key list); `POST /api/admin/audio/generate` (body: `{ key }`, calls ttsProvider, writes MP3, updates registry to `awaiting_approval`); `POST /api/admin/audio/approve` (body: `{ key }`, sets registry status to `approved`, regenerates `coach-audio-manifest.json` from all currently approved slugs)
- [x] T017 [US6] Create `connect-four/src/pages/AdminAudioPage.jsx`: fetches `/api/admin/audio/status`; groups keys by status (approved / awaiting_approval / needs_audio / ineligible); per-key: Generate button, playback `<audio>` element, Approve button; bulk actions: "Generate all new" (calls generate for all needs_audio keys sequentially), "Approve all generated" (calls approve for all awaiting_approval keys)
- [x] T018 [US6] Wire `AdminAudioPage` in `connect-four/src/App.jsx`: add `window.location.pathname.startsWith('/admin/audio')` check **before** the existing `/admin` catch-all (must come first — more specific path wins)

**Checkpoint**: User Story 6 functional — full generate → listen → approve workflow works locally. `coach-audio-manifest.json` reflects approved keys.

---

## Phase 7: User Story 4 — Spoken Coach Messages (Priority: P4)

**Goal**: When speech is enabled, each approved coach message is read aloud as it appears. Speech toggle persists.

**Independent Test**: Enable speech toggle. Play a sparring game — coach messages are spoken. Disable speech — silence. Re-enable — next message is spoken. No 404 errors in console.

**Depends on**: T004 (useAudio speech preference), T015–T018 (approved audio + manifest in place)

- [x] T019 [US4] Implement `connect-four/src/lib/useCoachSpeech.js`: on mount, fetches `public/audio/coach/coach-audio-manifest.json` once and stores in a ref (list of approved slug strings — no blind-fetch 404s); expose `speakCoachMessage(key)` which derives the slug from the key, checks if slug is in the manifest and `speechEnabled` is true, then plays the MP3; if a message is already playing, interrupt it before starting the new one
- [x] T020 [US4] Wire `useCoachSpeech` in `connect-four/src/screens/GameScreen.jsx`: call `speakCoachMessage(messageKey)` whenever a new coach message is pushed to the messages array
- [x] T021 [US4] Wire `useCoachSpeech` in `connect-four/src/screens/ChallengeScreen.jsx`: call `speakCoachMessage(messageKey)` whenever a new coach message appears
- [x] T022 [US4] Add speech toggle button alongside SFX and music toggles in `GameScreen.jsx` and `ChallengeScreen.jsx` (calls `toggleSpeech()` from `useAudio`)

**Checkpoint**: User Story 4 functional — approved coach messages play aloud when speech is enabled, silence when disabled.

---

## Phase 8: User Story 5 — Tappable KB Terms in Deep Reveal (Priority: P5)

**Goal**: Recognized tactical terms in deep-reveal explanations are visually distinct. Tapping shows a popup with a 1–2 sentence summary and lesson/practice CTA.

**Independent Test**: Trigger a deep reveal for a position with a Z-threat. The word "Z-threat" in the explanation is visually highlighted differently from zone references. Tap it — popup appears with a 1–2 sentence definition. If the Z-threat lesson exists and is incomplete, a "Go to lesson" button appears. Tapping zone references still toggles board highlights as before. No interference between the two interaction types.

**Depends on**: T003 (`short_summary` in KB entries), T004 (lesson progress via store)

- [x] T023 [US5] Create `connect-four/src/lib/kbTermLesson.js`: export a static constant mapping all 9 eligible `kbId`s to `{ lessonId?, practiceCategory?, displayName }`. All 9 terms must be present; terms with no lesson/practice have only `displayName`. (See research.md R1 table for which terms have lesson/practice.)
- [x] T024 [US5] Add `loadKBShortSummary(id)` function to `connect-four/server/llmCoachHelpers.js`: reads `docs/knowledge-base/<id>.md`, parses YAML frontmatter, returns the `short_summary` string or `null` if not present. (Reuse the existing `readFileSync` + frontmatter extraction pattern from `loadKBStatement`.)
- [x] T025 [US5] Extend `buildExplainContext` in `connect-four/server/explainContext.js`: after the classifier call, detect which entries from `PATTERN_KB` are relevant to the position by checking pattern detection results (`correctMovePatterns`, `patPlayed`); build a dedicated `kbTermsSection` by iterating `PATTERN_KB` entries that have an `{id}` field (not `{inline}`), skipping `forced_win` (no `.md` file), and filtering to only those whose pattern key appears in `correctMovePatterns` or `patPlayed`; for each eligible entry, call `loadKBShortSummary(PATTERN_KB[key].id)` to get the summary and format one line: `- [term:community-z-threat] **Z-threat** (community-z-threat): <short_summary>` — using the exact slug from `PATTERN_KB[key].id`, not the internal pattern key (`PATTERN_KB[patternKey].id` gives the slug, `loadKBShortSummary(slug)` gives the summary); do NOT call `buildKBSection` (leave it untouched); pass the resulting `kbTermsSection` as a new parameter to `buildBlunderExplainPrompt`
- [x] T026 [US5] Extend `buildBlunderExplainPrompt` in `connect-four/server/llmCoachHelpers.js`: add `kbTermsSection` as a new optional parameter; when provided, append the `kbTermsSection` content to the prompt body (the section is pre-formatted by T025 — no additional formatting needed here); add the `[term:kbId]…[/term:kbId]` emission instruction to the **existing** `## Output format` block (~lines 681–697) — append it there, not in a new block. (Note: `kbTermsSection` is built entirely in T025; T026 only wires it into the prompt signature and appends it.)
- [x] T027 [US5] Extend `POST /api/explain-move-llm` in `connect-four/server/index.js`: after a valid explanation is confirmed, scan it for `[term:kbId]` tags; build `termsMap = { [kbId]: short_summary }` by calling `loadKBShortSummary` for each distinct kbId; write `terms: termsMap` into the `deep_reveal_json` JSONB on cache insert (no schema change needed). All 6 return sites in this endpoint must include `terms` in their response:
  1. Cache hit (~line 850) — return `terms: cached.deep_reveal_json.terms ?? {}`
  2. No-context branch (~line 863) — return `terms: {}`
  3. All-moves-equal branch (~line 871) — return `terms: {}`
  4. Trivial branch (~line 880) — return `terms: {}`
  5. Double-failure fallback (~line 943) — return `terms: {}`
  6. Success path (~line 964) — return `terms: termsMap` (newly built)
- [x] T028 [US5] Extend `parseAnnotatedText` in `connect-four/src/lib/annotatedText.js`: in a single pass, detect both `[zone:spec]` and `[term:kbId]` tags by checking the tag prefix; return `{ cleanText, zones, terms }` where `terms` has shape `{ index, kbId, startChar, endChar, text }`. Also add `terms: []` to `regexFallbackParse` return value for backward compatibility.
- [x] T029 [US5] Create `connect-four/src/components/KbTermPopup.jsx`: a `position: fixed` popup anchored to the tapped term span's bounding rect. Props: `{ kbId, summary, lessonId, practiceCategory, lessonCompleted, onClose, navigate }`. Shows: term display name (from `kbTermLesson.js`), 1–2 sentence summary, CTA button ("Go to lesson" if `lessonId` present and `!lessonCompleted`; "Go to practice" if `practiceCategory` present and `lessonCompleted`; no CTA otherwise). Tapping outside the popup calls `onClose`.
- [x] T030 [US5] Extend `connect-four/src/components/AnnotatedText.jsx`: accept new `terms` prop (array of term annotation objects from `parseAnnotatedText`); render term spans with distinct visual styling (e.g. dashed amber underline — visually distinct from zone spans' dotted blue); on tap, call `onTapTerm(kbId, domRect)` callback passing the span's bounding rect. Zone span behavior (toggle board highlight) is unchanged.
- [x] T031 [US5] Extend `connect-four/src/components/AnnotatedExplanation.jsx`: accept new `termsMap` prop (`{ [kbId]: string }`); after calling `parseAnnotatedText`, pass the resulting `terms` array to `AnnotatedText` via the new `terms` prop; on `onTapTerm`, look up `summary` from `termsMap`, look up lesson info from `kbTermLesson.js`, check lesson completion via `store.getLessonProgress(lessonId)`, and render `KbTermPopup`
- [x] T032 [US5] Locate the component that renders `AnnotatedExplanation` from the explain-move-llm API response (likely `DeepRevealPane.jsx` or equivalent); pass `termsMap` from the API response as the new `termsMap` prop into `AnnotatedExplanation`

**Checkpoint**: User Story 5 functional — tapping a KB term in deep reveal shows the correct popup; zone taps still highlight the board; the two interaction types do not interfere.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, deploy preparation, and architecture updates.

- [x] T033 [P] Update `docs/architecture/api-conventions.md` — document the `terms: { [kbId]: string }` field on `/api/explain-move-llm` response; note it is always present (empty `{}` minimum) and carries `short_summary` values (not full `statement`)
- [x] T034 [P] Update `docs/architecture/frontend-conventions.md` — document the audio preference pattern (`useAudio` hook, three `localStorage` keys with defaults, no direct `localStorage` reads in components) and the `coach-audio-manifest.json` pattern (fetched once at mount in `useCoachSpeech`, no blind-fetch 404s)
- [x] T035 [P] Update `docs/knowledge-base/README.md` — document the `short_summary` frontmatter field: definition, eligibility rule (entry must have a real `.md` file + `short_summary` populated to appear in term popups), distinction from `statement` (statement is LLM-prompt-only, short_summary is sent to client)
- [x] T036 Update `specs/039-audio-interactive-coach/quickstart.md` — document the TTS generate+approve developer workflow and the deploy-time step: `TRUNCATE explanation_cache;` must be run in Supabase SQL editor before deploying this feature (clears pre-feature cached rows that lack `[term:...]` tags)
- [x] T037 Run full manual QA: (a) sparring game — disc sounds, win sound, music, speech, pacing gap; (b) challenge puzzle — correct/wrong sounds, music, speech, pacing; (c) deep reveal — KB term popups, zone highlight still works, lesson CTA; (d) admin audio page — generate, listen, approve workflow; (e) mute preferences survive reload; (f) no console 404 errors for audio files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately. T002 and T003 are parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1. T004 (`useAudio`) blocks US1–US4.
- **Phase 3 (US1)**: Depends on T004.
- **Phase 4 (US2)**: Depends on T004. Can run in parallel with Phase 3.
- **Phase 5 (US3)**: Depends on T002 (`constants.js`). Fully independent of T004.
- **Phase 6 (US6)**: Depends on T001 (audio dirs). Independent of T004.
- **Phase 7 (US4)**: Depends on T004 + Phase 6 (approved audio + manifest). Must come after Phase 6.
- **Phase 8 (US5)**: Depends on T003 (short_summary). Independent of audio tracks. Can run in parallel with Phases 3–7.
- **Phase 9 (Polish)**: Depends on all phases complete.

### User Story Dependencies

- **US1 (P1)**: Depends on T004 (`useAudio`)
- **US2 (P2)**: Depends on T004 (`useAudio`)
- **US3 (P3)**: Depends only on T002 (`constants.js`) — fastest to ship
- **US6 (P6)**: Depends on T001 (dirs). No cross-story dependencies.
- **US4 (P4)**: Depends on T004 + US6 (approved audio infrastructure). Must follow US6.
- **US5 (P5)**: Depends on T003 (KB short_summary) and T004 (lesson progress store). Can run in parallel with US1–US4.

### Cross-Track Ordering Constraints

```
T001 (dirs) → T004 (useAudio) → T005–T010 (US1, US2 wiring)
T002 (constants) → T011–T012 (US3 pacing)
T003 (short_summary) → T024 (loadKBShortSummary) → T025 → T026 → T027 → T028 → T029 → T030 → T031 → T032
T023 (kbTermLesson) → T031 (AnnotatedExplanation CTA)
T013 (ttsProvider) → T014 (generate script) → T015 (registry init) → T016 (admin endpoints) → T017 (admin page) → T018 (routing)
T016 (approve endpoint regenerates manifest) → T019 (useCoachSpeech reads manifest) → T020–T021 (wiring)
```

---

## Parallel Opportunities

### Within Phase 1 (Setup)
T002 and T003 can run in parallel with T001.

### Within Phase 3 (US1)
T005 (sparring SFX) and T006 (challenge SFX) can run in parallel.

### Within Phase 8 (US5)
T023 (kbTermLesson) and T024 (loadKBShortSummary) can run in parallel.
T025, T026, T027 are sequential server-side tasks.
T029 (KbTermPopup) can run in parallel with T028 (parseAnnotatedText extension).

### Across Stories
Phase 5 (US3) can be worked independently at any time after T002.
Phase 8 (US5) can be worked in parallel with Phases 3–7 (separate files, no overlapping edits).

---

## Implementation Strategy

### MVP First (US1 + US3 Only)

1. Complete Phase 1 (T001–T003)
2. Complete Phase 2 (T004)
3. Complete Phase 3 (T005–T007): disc sounds, win/correct/wrong — simplest audio wiring
4. Complete Phase 5 (T011–T012): pacing fix — tiny change, high impact
5. **STOP and VALIDATE**: both independently testable without TTS or KB features

### Incremental Delivery

- Phase 3 (US1) → sounds during gameplay
- Phase 4 (US2) → add background music
- Phase 5 (US3) → add pacing fix
- Phase 6+7 (US6+US4) → add spoken coach (requires all audio files approved)
- Phase 8 (US5) → add KB term popups in deep reveal

### Single Developer Sequence

Recommended order to minimize context switching:
1. T001, T002, T003 (setup)
2. T004 (useAudio — core hook)
3. T011, T012 (pacing — small, independent, high value)
4. T005, T006, T007 (SFX wiring)
5. T008, T009, T010 (music wiring)
6. T013–T018 (TTS infrastructure + admin page)
7. T019–T022 (spoken coach wiring)
8. T023–T032 (KB glossary pipeline)
9. T033–T037 (polish + docs)

---

## Notes

- T012 (ChallengeScreen pacing): the 300ms `setTimeout` at ChallengeScreen.jsx:430 is disc-animation settle — do NOT change it. The pacing delay is new code inserted between coach message push calls.
- T027 (explain endpoint): `deep_reveal_json` already accepts arbitrary JSONB — no schema migration needed. Old cache rows return `{}` for `terms`. Run `TRUNCATE explanation_cache;` in Supabase at deploy time (see T036).
- T018 (App.jsx routing): the `/admin/audio` route check MUST come before the existing `/admin` catch-all — insert it above that check.
- T015 (registry init): `coach-audio-manifest.json` starts as `[]` — `useCoachSpeech` handles this gracefully (no audio plays until keys are approved).
- T003 (`short_summary`): `allis-baseclaim`, `allis-before`, `allis-specialbefore` will never appear in deep-reveal positions but are included for completeness per FR-023.
- `forced_win` is permanently excluded from term annotation — do not add a `derived-lost-position.md` KB entry as part of this feature.
