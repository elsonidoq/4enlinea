-- Migration 051: add quality column to blunders
-- Unifies suboptimal moves and blunders under one table.
-- Existing rows default to 'blunder' (only blunders were ever inserted before this migration).
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE public.blunders
  ADD COLUMN IF NOT EXISTS quality text NOT NULL DEFAULT 'blunder'
  CHECK (quality IN ('suboptimal', 'blunder'));
