-- Migration 050: Add audio_path and audio_generated_at columns to explanation_cache.
-- Supports TTS caching for deep-reveal spoken explanations.
-- audio_path: Supabase Storage object path (e.g. tts/deep-reveal/<hash>.mp3). Null = audio not generated yet.
-- audio_generated_at: timestamp when the TTS audio was generated. Used for cleanup pruning (30-day retention).

ALTER TABLE public.explanation_cache
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS audio_generated_at timestamptz;
