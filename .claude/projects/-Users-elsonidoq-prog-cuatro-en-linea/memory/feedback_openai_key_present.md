---
name: feedback_openai_key_present
description: "OPENAI_API_KEY IS present at connect-four/server/.env and works for live TTS — never defer real-key verification assuming it's absent"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: aff1c763-adc9-4a00-bba8-7a49da992f08
---

**A real, working `OPENAI_API_KEY` lives in `connect-four/server/.env`.** Do NOT assume it is missing and
defer real-provider verification (TTS synth, LLM eval, etc.) to "staging / needs a real key." Twice in
spec 046 subagents skipped the real-key audio-generation check (T030) on the assumption no key existed;
the owner corrected this. The dev server already loads it (`npm run dev` / `npm run server` run
`node --env-file=server/.env`). For an inline check, either hit the localhost admin endpoint (the running
server has the key) or `node --env-file=server/.env <script>`.

**Why:** deferring a verifiable check produces a false "can't confirm locally" when the capability is in
fact fully testable on localhost — the owner wants real end-to-end verification done, not punted.

**How to apply:** before writing "requires a real key, deferred," first try it against `server/.env`. Lesson
audio generation was verified this way (real MP3s synthesized + served). Related: [[reference_llm_model_env_vars]],
[[reference_supabase_connection]] (same `.env` file location trap), [[project_lesson_progression_audio_traps]].
