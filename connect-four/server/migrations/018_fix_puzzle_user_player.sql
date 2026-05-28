-- Fix user_player for all existing puzzles (was always DEFAULT 1 due to missing insert field)
UPDATE puzzles
SET user_player = CASE WHEN length(move_string) % 2 = 0 THEN 1 ELSE 2 END;
