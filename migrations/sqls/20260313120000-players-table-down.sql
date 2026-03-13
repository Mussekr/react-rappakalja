/* Reviewer fix C1: drop column BEFORE dropping the players table (correct order) */
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_unique_per_round;
ALTER TABLE games DROP COLUMN IF EXISTS current_master_id;
DROP TABLE IF EXISTS players;
