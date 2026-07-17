-- 058: Make blunders device-keyable so anonymous onboarding users can store
-- (and later re-associate) their blunder rows, mirroring the games device_uuid
-- trick (migration 026 / OI-20). Anon rows have user_id NULL + device_uuid set;
-- /api/user/migrate re-keys them to user_id on sign-up.

-- Anon rows cannot set user_id (no account yet).
ALTER TABLE public.blunders ALTER COLUMN user_id DROP NOT NULL;

-- Device owner for anonymous rows (NULL for authenticated rows). Mirrors games.device_uuid.
ALTER TABLE public.blunders ADD COLUMN IF NOT EXISTS device_uuid text;

-- Dedup for anon AI-sparring rows. The existing (user_id, game_id, move_index)
-- unique index does NOT dedup anon rows: Postgres treats NULL user_id as distinct.
-- DISTINCT NEW NAME (index-name reuse silently no-ops).
CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_device_game_unique
  ON public.blunders (device_uuid, game_id, move_index)
  WHERE user_id IS NULL AND device_uuid IS NOT NULL AND game_id IS NOT NULL;

-- Lookup index for the anon coach-queue read path.
CREATE INDEX IF NOT EXISTS idx_blunders_device_created
  ON public.blunders (device_uuid, created_at DESC)
  WHERE user_id IS NULL;
