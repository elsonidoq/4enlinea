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

**EXCEPTION — Claude Code on the web / CCR containers have NO `server/.env` at all.** Verified
2026-07-25: `connect-four/server/.env` **does not exist** in the remote execution container (the repo is
cloned fresh; the untracked `.env` never comes with it). So in a remote session the key genuinely is
absent, and TTS/LLM/Supabase-backed work cannot be verified there — that is a real environment limit,
not the assumption this memory warns against. Resolve it by **checking**, not assuming either way:
`ls connect-four/server/.env`. If absent, say "deferred: no `.env` in this remote container, verifiable
on localhost" rather than either punting vaguely or claiming a check you couldn't run. The don't-punt
rule above is about **local** sessions, where the key is present and everything is testable.

**How to apply:** before writing "requires a real key, deferred," first try it against `server/.env`. Lesson
audio generation was verified this way (real MP3s synthesized + served). Related: `docs/architecture/server-conventions.md` §Environment Variables,
[[reference_supabase_connection]] (same `.env` file location trap), [[project_lesson_progression_audio_traps]].
