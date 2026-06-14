-- Epic 1 (patterns-blunders): add reason column to blunders
-- Nullable TEXT; no index; human-inspectable offline only.
-- Stores the detector output or human annotation that explains why a
-- particular pattern_category was assigned (e.g., "no pattern detected").

ALTER TABLE public.blunders ADD COLUMN reason TEXT;
