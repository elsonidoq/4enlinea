ALTER TABLE candidates ADD COLUMN user_player smallint NOT NULL DEFAULT 1 CHECK (user_player IN (1,2));
ALTER TABLE puzzles    ADD COLUMN user_player smallint NOT NULL DEFAULT 1 CHECK (user_player IN (1,2));

UPDATE candidates SET user_player = CASE WHEN length(move_string) % 2 = 0 THEN 1 ELSE 2 END;
UPDATE puzzles    SET user_player = CASE WHEN length(move_string) % 2 = 0 THEN 1 ELSE 2 END;
