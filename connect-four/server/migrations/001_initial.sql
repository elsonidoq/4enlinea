-- Migration 001: Users table extension, tracks, stripe_events
-- HUMAN REVIEW REQUIRED before applying to production.
-- Apply via: psql $DATABASE_URL -f connect-four/server/migrations/001_initial.sql

-- Extend Supabase Auth users with app-specific columns
CREATE TABLE IF NOT EXISTS public.users (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_uuid           text UNIQUE,
  tier                  text NOT NULL DEFAULT 'free'
                        CHECK (tier IN ('anonymous', 'free', 'paid')),
  deep_reveal_count     integer NOT NULL DEFAULT 0,
  deep_reveal_reset_at  timestamptz NOT NULL DEFAULT (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'),
  stripe_customer_id    text UNIQUE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Auto-create user profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Analytics events
CREATE TABLE IF NOT EXISTS public.tracks (
  id          bigserial PRIMARY KEY,
  uid         text NOT NULL,
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  path        text NOT NULL,
  event       text NOT NULL,
  event_data  jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracks_uid        ON public.tracks(uid, created_at);
CREATE INDEX IF NOT EXISTS idx_tracks_event      ON public.tracks(event, created_at);
CREATE INDEX IF NOT EXISTS idx_tracks_user_id    ON public.tracks(user_id, created_at);

-- Stripe event audit log
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id  text UNIQUE NOT NULL,
  type             text NOT NULL,
  payload          jsonb NOT NULL,
  processed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- tracks and stripe_events: service role only (no RLS needed; server uses service key)
