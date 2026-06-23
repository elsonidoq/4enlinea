---
name: project_deep_reveal_tts
description: Deep Reveal TTS — streaming spoken explanations for DeepRevealPane using OpenAI TTS + Supabase Storage cache
metadata: 
  node_type: memory
  type: project
  originSessionId: f91a4b1e-9aa2-4175-ba1d-626248e20591
---

Deep Reveal TTS speaks the LLM-generated explanation in DeepRevealPane.jsx using OpenAI
streaming TTS. Audio is cached in Supabase Storage keyed by sha256(cleaned text),
not position_hash — so regenerated explanations get fresh audio.

**Why:** Pre-recorded coach lines use a manifest system; deep-reveal text is dynamic
and needs on-demand TTS with caching.

**How to apply:** Reference these patterns when debugging TTS, extending the speech
queue, or adding new TTS-backed features.

## Endpoints

- **`GET /api/user/tts/deep-reveal?moveString=...&col=...`** — auth-gated.
  - Cache hit: 302 redirect to signed Supabase Storage URL (1-week TTL).
  - Cache miss: pipes OpenAI TTS stream to client (Content-Type: audio/mpeg;
    chunked transfer); simultaneously buffers chunks; fire-and-forget uploads to
    Supabase Storage + updates explanation_cache.
- **`POST /api/admin/tts/cleanup`** — localhost-only. Deletes storage objects and
  nulls audio_path/audio_generated_at for rows older than 30 days.

## Key design decisions

- **Streaming (not buffer-first):** GET endpoint → Audio element follows redirect
  or plays stream natively. Browser handles chunked transfer. Server tees chunks
  for background upload.
- **Audio keyed by `sha256(stripped_text)`**, not `position_hash`. Prevents stale
  audio after explanation regeneration.
- **`streamComplete` guard**: only upload to Storage if the full stream completed
  (not truncated by client disconnect). Prevents caching partial MP3s.
- **Text pre-processing**: `stripAnnotationsForTTS()` removes `[zone:X]...[/zone:X]`
  and `[term:X]...[/term:X]` tags, keeping inner text. Defined in server/index.js
  near `readTtsConfig()`.

## Frontend integration (DeepRevealPane.jsx)

- **Two-phase reveal**: Phase 1 = fetch `/api/explain-move-llm` (spinner); Phase 2
  = create `new Audio(TTS_URL)`, wait for `canplay` event, THEN reveal text +
  call `speakDeepReveal(audio)`.
- **`speechEnabled` gate**: Phase 2 skipped if speech is off — text shown immediately.
- **Panel close**: calls `stopSpeech()` (module-level from useCoachSpeech.js) +
  clears the TTS Audio element's src.
- **TTS failure**: silent degradation — text is shown without audio.
- **`canplay` + `error` race**: resolved via `Promise` with `{ once: true }` on
  both events + 5s timeout fallback.

## Extended useCoachSpeech.js

- **Module-level queue**: `speechQueue` type changed from `string[]` to
  `Array<string | HTMLAudioElement>`.
- **`speakDeepReveal(audio: HTMLAudioElement)`**: pushes a pre-built Audio element
  into the unified queue. No manifest check — dynamic TTS bypasses pre-approval.
- **`stopSpeech()`**: pauses current speech, clears src (prevents stale events),
  nulls `currentSpeechAudio`, empties the queue.

## DB changes (migration 050)

- `explanation_cache.audio_path` — nullable text; Supabase Storage path
  (e.g. `tts/deep-reveal/<sha256>.mp3`).
- `explanation_cache.audio_generated_at` — nullable timestamptz; used for
  30-day cleanup pruning.

## Supabase Storage

- **Bucket**: `coach-tts` (private, created in dashboard — no startup code).
- **Path convention**: `tts/deep-reveal/<sha256>.mp3`.
- **Upload options**: `{ contentType: 'audio/mpeg', upsert: true }`.
- **Signed URL TTL**: 604800s (1 week).

