---
name: project_lesson_progression_audio_traps
description: "Lesson order derives from filename prefix (JSON order ignored); lesson audio must use ttsProvider.synthesize, NOT the i18n-keyed coach pipeline"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4176d659-b797-4125-825c-a96fa2d4c8f2
---

Traps for lesson progression + lesson audio (spec 046 territory; some pre-existing).

**Lesson order = filename numeric prefix, NOT the JSON `order` field.** `server/lessonLoader.js:145-148` does `{...lesson, order}` where `order = parseInt(filename.match(/^lesson-(\d+)-/))`, then sorts ascending. The JSON `order` field is **overwritten and ignored** — some files have stale/wrong values (e.g. `lesson-06-z-threats.json` has `order: null`); harmless. To reorder lessons you **rename the files** (`git mv`, use git so collisions fail loudly), not edit JSON. `id` is independent of filename, so renames preserve `lesson_progress` records. Free/paid split is by each JSON's `free` flag, not position.

**Lesson audio can't reuse the spec-039 coach TTS pipeline.** That pipeline is keyed end-to-end by **i18n keys** in `en.json` (`scripts/generate-tts.js` scans `coach.*`; registry/manifest keyed by key; runtime `speakCoachMessage(key)` plays by key and is **manifest-gated**). Lesson slide coach messages are **inline free-text** (`slides[].coachMessages[].text`), not i18n keys — so `speakCoachMessage(key)` would **silently no-op** on them. The only reusable seam is `server/ttsProvider.js` `synthesize(text)`. Spec 046 design: hash each concept-slide message's text → MP3 under `public/audio/lessons/` (committed static, no manifest) → store path at `coachMessages[].audio`; playback via `speakDeepReveal(new Audio(path))`, NOT `speakCoachMessage`. Socratic prompts stay i18n-driven (no lesson-JSON coach messages) — out of audio scope.

**`<CoachDialog>` renders the speech *bubble* but never plays audio itself** (confirmed
2026-07-13). It has no auto-play; its `m.audio` field only decides whether the 🔁 replay button
shows (gated on `onReplay && hasNarration`). Any screen that wants the coach to actually *speak*
on arrival must call `useCoachSpeech()` + `speakCoachMessage(i18nKey)` in an effect itself (as
`GameScreen`/`ChallengeScreen`/`ReviewScreen` do). Passing a message into `CoachDialog` is never
sufficient — a common mistake (e.g. `OnboardingMissionScreen` shows the greeting but is silent).
Relatedly, **`/admin/audios` is just a view of `server/tts-registry.json`** (via `GET
/api/admin/audio/status`), and that registry is populated by `scripts/generate-tts.js` scanning
**only `coach.*` keys** in `en.json` — so a phrase under any other namespace (e.g.
`onboarding.mission.*`) is invisible on the admin page and can never get generated/approved audio
until it's re-keyed under `coach.*`.

**`speakDeepReveal(audio)` in `src/lib/useCoachSpeech.js` is a module-level singleton queue** (file-scope `speechQueue`/`currentSpeechAudio`), shared with deep-reveal narration — pushing lesson clips into it gives "one at a time" playback for free. It does NOT check the global `speechEnabled` toggle; the caller must gate on `speechEnabled` and call `stopSpeech()` on unmount/navigation. Correcting the epic: spec 039 keys by i18n key, NOT text hash — the text-hash idea is the correct *new* lesson design, not a spec-039 attribution. Related: [[project_spec039_audio_interactive_coach]], [[project_admin_localhost_directive]].

**Dev-serving trap for `public/audio/lessons/*.mp3`:** in dev, the Express server on **:3001 serves `../dist`** (the built bundle) and does NOT serve `public/` — so `curl :3001/audio/lessons/x.mp3` returns the SPA `index.html` fallback (200, `text/html`), looking broken. **Vite on :5173 serves `public/` directly**, so the actual app fetches lesson audio fine (200, `audio/mpeg`). Test serving against :5173, not :3001. In prod, `vite build` copies `public/`→`dist/` so Express serves it. Also: the Node **server does not hot-reload** ([[project_app_qa_setup_gotchas]]) — after adding the generate/prune routes you must restart it (`node --env-file=server/.env server/index.js`) or the endpoint 404s "Cannot POST". Spec 046 verified end-to-end on localhost (real key at [[feedback_openai_key_present]]): generate → 4 real MP3s → persisted `coachMessages[].audio` → served via :5173 → playback (HTTP 206) → idempotent re-run generates 0.
