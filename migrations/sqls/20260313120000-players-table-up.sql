/* Players table — one record per player per game */
CREATE TABLE players (
    id serial PRIMARY KEY,
    game_code text NOT NULL,
    name text NOT NULL,
    is_master boolean NOT NULL DEFAULT FALSE,
    created_at timestamp NOT NULL DEFAULT NOW(),
    /* Reviewer fix C2: prevent duplicate names in the same game via race condition */
    UNIQUE (game_code, name)
);

CREATE INDEX idx_players_game_code ON players(game_code);

/* Reviewer fix C1: FK with ON DELETE SET NULL so dropping a player doesn't break the game */
ALTER TABLE games ADD COLUMN current_master_id integer REFERENCES players(id) ON DELETE SET NULL;

/* API Guardian fix: add unique constraint to prevent duplicate answers per round */
ALTER TABLE answers ADD CONSTRAINT answers_unique_per_round UNIQUE (gamecode, round, author);
