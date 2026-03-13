import express from 'express';
import cookieParser from 'cookie-parser';
import randomize from 'randomatic';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(db) {
    const app = express();

    // Helper: emit socket.io event to all sockets in a game room
    function emitToGame(gameCode, event, data = {}) {
        const io = app.get('io');
        if (io) {
            io.to(`game:${gameCode}`).emit(event, data);
        }
    }

    app.use(cookieParser());
    app.use(authMiddleware);
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '..', 'dist')));

    // Helper: check if player is master for their current game
    async function isMaster(req) {
        if (!req.player) return false;
        const game = await db.oneOrNone(
            'SELECT current_master_id FROM games WHERE code = $1 AND active = TRUE',
            [req.player.gameCode]
        );
        return game && game.current_master_id === req.player.playerId;
    }

    // Helper: get player's answered count for a game (by round count in answers table)
    async function getAnsweredCount(playerId, gameCode) {
        const result = await db.one(
            'SELECT count(*)::int as count FROM answers WHERE gamecode = $1 AND author = (SELECT name FROM players WHERE id = $2)',
            [gameCode, playerId]
        );
        return result.count;
    }

    // Check if game exists
    // API Guardian fix: return success:false on 400
    app.get('/api/game/:id', async (req, res) => {
        try {
            const data = await db.oneOrNone('SELECT count(code) FROM games WHERE code = $1', [req.params.id]);
            if (data && data.count === String(1)) {
                res.send({ success: true, exist: true });
            } else {
                res.status(400).send({ success: false, exist: false });
            }
        } catch {
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // Create new game — master is also a player with a name
    app.post('/api/newgame', async (req, res) => {
        const code = randomize('A0', 5);
        if (req.player && req.player.gameCode) {
            res.status(400).send({ success: false, error: 'Cannot create new game, already one open' });
            return;
        }
        if (!req.body.name || !req.body.name.trim()) {
            res.status(400).send({ success: false, error: 'A name is required to create a game' });
            return;
        }
        try {
            // Use transaction for multi-step operation (reviewer fix H7)
            const player = await db.tx(async t => {
                await t.none('INSERT INTO games (code, currentround, active) VALUES ($1, $2, TRUE)', [code, 1]);
                const p = await t.one(
                    'INSERT INTO players (game_code, name, is_master) VALUES ($1, $2, TRUE) RETURNING id',
                    [code, req.body.name.trim()]
                );
                await t.none('UPDATE games SET current_master_id = $1 WHERE code = $2', [p.id, code]);
                return p;
            });
            await req.setToken({ playerId: player.id, gameCode: code });
            res.send({ success: true, code: code });
        } catch {
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // Join game — creates a player record
    // UNIQUE(game_code, name) enforced at DB level; also check here for clear error message
    app.post('/api/join', async (req, res) => {
        if (!req.body.author || !req.body.author.trim()) {
            res.status(400).send({ success: false, error: 'A player name is required' });
            return;
        }
        if (!req.body.gameId || !req.body.gameId.trim()) {
            res.status(400).send({ success: false, error: 'A game code is required' });
            return;
        }
        try {
            // Use transaction for multi-step operation (reviewer fix H7)
            const player = await db.tx(async t => {
                const data = await t.oneOrNone(
                    'SELECT count(code) FROM games WHERE code = $1 AND active = TRUE',
                    [req.body.gameId]
                );
                if (!data || data.count !== String(1)) {
                    return null; // Signal game not found
                }

                // UNIQUE constraint at DB level handles race condition;
                // check first for a friendly error message
                const existing = await t.oneOrNone(
                    'SELECT id FROM players WHERE game_code = $1 AND name = $2',
                    [req.body.gameId, req.body.author.trim()]
                );
                if (existing) {
                    throw { code: 'DUPLICATE_NAME' };
                }

                return t.one(
                    'INSERT INTO players (game_code, name, is_master) VALUES ($1, $2, FALSE) RETURNING id',
                    [req.body.gameId, req.body.author.trim()]
                );
            });

            if (player === null) {
                res.status(400).send({ success: false, error: 'Game not found!' });
                return;
            }

            await req.setToken({ playerId: player.id, gameCode: req.body.gameId });
            res.send({ success: true });
            emitToGame(req.body.gameId, 'players:updated');
        } catch (err) {
            if (err && err.code === 'DUPLICATE_NAME') {
                res.status(400).send({ success: false, error: 'A player with that name already exists in this game!' });
                return;
            }
            // Handle DB-level unique constraint violation too
            if (err && err.code === '23505') {
                res.status(400).send({ success: false, error: 'A player with that name already exists in this game!' });
                return;
            }
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // Submit answer — works for both master and regular players
    // Duplicate answer prevention: UNIQUE(gamecode, round, author) constraint at DB level
    app.post('/api/answer', async (req, res) => {
        if (!req.player) {
            res.status(400).send({ success: false, error: 'Not in a game' });
            return;
        }
        if (!req.body.answer || !String(req.body.answer).trim()) {
            res.status(400).send({ success: false, error: 'Answer cannot be empty' });
            return;
        }
        if (!req.body.currentRound) {
            res.status(400).send({ success: false, error: 'Current round is required' });
            return;
        }
        try {
            const playerInfo = await db.one('SELECT name FROM players WHERE id = $1', [req.player.playerId]);
            await db.none(
                'INSERT INTO answers (gamecode, round, author, answer) VALUES ($1, $2, $3, $4)',
                [req.player.gameCode, req.body.currentRound, playerInfo.name, req.body.answer]
            );
            res.send({ success: true });
            emitToGame(req.player.gameCode, 'answers:updated');
        } catch (err) {
            // Handle duplicate answer (unique constraint violation)
            if (err && err.code === '23505') {
                res.status(400).send({ success: false, error: 'You have already answered this round' });
                return;
            }
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // Get answers for a round (master only)
    // Returns { success, answers, phase, masterAnswered, totalAnswers }
    app.get('/api/answers/:round', async (req, res) => {
        try {
            const masterCheck = await isMaster(req);
            if (!req.player || !masterCheck) {
                res.status(400).send({ success: false, error: 'You are not game master!' });
                return;
            }

            const answers = await db.any(
                'SELECT * FROM answers WHERE gamecode = $1 AND round = $2',
                [req.player.gameCode, req.params.round]
            );
            const answeredCount = await getAnsweredCount(req.player.playerId, req.player.gameCode);
            const hasAnswered = answeredCount >= Number(req.params.round);

            const phase = hasAnswered ? 'reveal' : 'answering';

            res.send({
                success: true,
                answers: phase === 'answering' ? [] : answers,
                phase,
                masterAnswered: hasAnswered,
                totalAnswers: answers.length
            });
        } catch {
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // Advance to next round — master picks next master
    // Reviewer fix: validate that nextMasterId UPDATE affected a row
    app.post('/api/nextround', async (req, res) => {
        try {
            const masterCheck = await isMaster(req);
            if (!req.player || !masterCheck) {
                res.status(400).send({ success: false, error: 'You are not game master!' });
                return;
            }

            // Use transaction for multi-step operation (reviewer fix H7)
            await db.tx(async t => {
                await t.none('UPDATE games SET currentround = currentround + 1 WHERE code = $1', [req.player.gameCode]);

                if (req.body.nextMasterId) {
                    const nextMasterId = Number(req.body.nextMasterId);

                    // Validate the new master actually exists in this game (reviewer fix)
                    const newMasterPlayer = await t.oneOrNone(
                        'SELECT id FROM players WHERE id = $1 AND game_code = $2',
                        [nextMasterId, req.player.gameCode]
                    );
                    if (!newMasterPlayer) {
                        throw { code: 'INVALID_MASTER', message: 'The chosen player does not exist in this game' };
                    }

                    await t.none('UPDATE players SET is_master = FALSE WHERE game_code = $1', [req.player.gameCode]);
                    await t.none('UPDATE players SET is_master = TRUE WHERE id = $1 AND game_code = $2', [nextMasterId, req.player.gameCode]);
                    await t.none('UPDATE games SET current_master_id = $1 WHERE code = $2', [nextMasterId, req.player.gameCode]);
                }
            });

            res.send({ success: true });
            emitToGame(req.player.gameCode, 'round:advanced');
            if (req.body.nextMasterId) {
                emitToGame(req.player.gameCode, 'master:changed', { newMasterId: Number(req.body.nextMasterId) });
            }
        } catch (err) {
            if (err && err.code === 'INVALID_MASTER') {
                res.status(400).send({ success: false, error: err.message });
                return;
            }
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // List players in a game
    // API Guardian fix: wrap response { success: true, players: [...] }
    app.get('/api/players', async (req, res) => {
        if (!req.player) {
            res.status(400).send({ success: false, error: 'Not in a game' });
            return;
        }
        try {
            const players = await db.any(
                'SELECT id, name, is_master FROM players WHERE game_code = $1 ORDER BY created_at',
                [req.player.gameCode]
            );
            res.send({ success: true, players });
        } catch {
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // Get session info — all state derived from DB
    app.get('/api/session', async (req, res) => {
        if (!req.player) {
            res.send({});
            return;
        }
        try {
            const data = await db.oneOrNone(
                'SELECT currentround as servercurrentround, active, current_master_id FROM games WHERE code = $1',
                [req.player.gameCode]
            );
            if (!data || !data.active) {
                req.clearToken();
                res.send({});
                return;
            }

            const playerInfo = await db.one('SELECT name FROM players WHERE id = $1', [req.player.playerId]);
            const masterFlag = data.current_master_id === req.player.playerId;
            const answeredCount = await getAnsweredCount(req.player.playerId, req.player.gameCode);

            res.send({
                servercurrentround: data.servercurrentround,
                active: data.active,
                gameId: req.player.gameCode,
                playerId: req.player.playerId,
                author: playerInfo.name,
                answered: answeredCount,
                master: masterFlag
            });
        } catch {
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // End game or leave
    app.post('/api/session/del', async (req, res) => {
        if (!req.player) {
            res.send({ success: true });
            return;
        }
        try {
            const master = await isMaster(req);
            const gameCode = req.player.gameCode;
            if (master) {
                await db.none('UPDATE games SET active = FALSE WHERE code = $1', [gameCode]);
                req.clearToken();
                res.send({ success: true });
                emitToGame(gameCode, 'game:ended');
            } else {
                await db.none('DELETE FROM players WHERE id = $1', [req.player.playerId]);
                req.clearToken();
                res.send({ success: true });
                emitToGame(gameCode, 'players:updated');
            }
        } catch {
            res.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    // Health check endpoint for Fly.io
    app.get('/api/health', (req, res) => {
        res.send({ status: 'ok' });
    });

    app.get('/api/{*path}', (req, res) => {
        res.status(404).send({ message: 'API endpoint not found' });
    });

    app.get('{*path}', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    });

    return app;
}
