/* Replace with your SQL commands */
CREATE TABLE games (
    "id" serial NOT NULL,
    code text,
    currentRound bigint
);

CREATE TABLE answers (
    "id" serial NOT NULL,
    gameCode text,
    author text,
    answer text,
    round bigint
);
