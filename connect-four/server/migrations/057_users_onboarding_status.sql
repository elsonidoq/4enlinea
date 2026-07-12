-- Migration 057: Add onboarding_status to users (Epic 8 — Onboarding Experience).
-- Three-state model: not_encountered (default) | seen | skipped.
-- NOT NULL DEFAULT means every existing and future row is well-formed with no
-- backfill step required. No new grants needed — 012_explicit_grants.sql and
-- 040_service_role_grants.sql are table-level and already cover `users`.
-- See specs/048-onboarding-experience/data-model.md for the full state model.

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'not_encountered'
  CHECK (onboarding_status IN ('not_encountered', 'seen', 'skipped'));
