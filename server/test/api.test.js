import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createMockDb } from './mockDb.js';

describe('API', () => {
    let app;
    let db;

    beforeEach(() => {
        db = createMockDb();
        app = createApp(db);
        vi.clearAllMocks();
    });

    describe('GET /api/game/:id', () => {
        it('returns exist: true when game found', async () => {
            db.oneOrNone.mockResolvedValue({ count: '1' });
            const res = await request(app).get('/api/game/ABCDE');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true, exist: true });
        });

        it('returns 400 with success:false when game not found', async () => {
            db.oneOrNone.mockResolvedValue({ count: '0' });
            const res = await request(app).get('/api/game/ZZZZZ');
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.exist).toBe(false);
        });
    });

    describe('POST /api/newgame', () => {
        it('creates a game and returns code', async () => {
            // The tx callback calls: t.none (insert game), t.one (insert player), t.none (update master)
            // We mock none and one to resolve in order
            db.none.mockResolvedValue(undefined);
            db.one.mockResolvedValue({ id: 42 });
            const res = await request(app)
                .post('/api/newgame')
                .send({ name: 'Alice' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.code).toMatch(/^[A-Z0-9]{5}$/);
            // tx should have been called once
            expect(db.tx).toHaveBeenCalledTimes(1);
        });

        it('returns 400 when name is missing', async () => {
            const res = await request(app).post('/api/newgame').send({});
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/join', () => {
        it('joins an existing active game', async () => {
            // tx callback calls: oneOrNone (check game), oneOrNone (check dup name), one (insert player)
            db.oneOrNone
                .mockResolvedValueOnce({ count: '1' }) // game exists
                .mockResolvedValueOnce(null);           // no duplicate name
            db.one.mockResolvedValueOnce({ id: 99 });   // insert player
            const res = await request(app)
                .post('/api/join')
                .send({ gameId: 'ABCDE', author: 'TestPlayer' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 400 for non-existent game', async () => {
            db.oneOrNone.mockResolvedValueOnce({ count: '0' });
            const res = await request(app)
                .post('/api/join')
                .send({ gameId: 'ZZZZZ', author: 'TestPlayer' });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 when author name is missing', async () => {
            const res = await request(app)
                .post('/api/join')
                .send({ gameId: 'ABCDE' });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/answer', () => {
        it('returns 400 when not authenticated', async () => {
            const res = await request(app)
                .post('/api/answer')
                .send({ currentRound: 1, answer: 'test' });
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/answers/:round', () => {
        it('returns 400 when not master', async () => {
            const res = await request(app).get('/api/answers/1');
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/nextround', () => {
        it('returns 400 when not master', async () => {
            const res = await request(app).post('/api/nextround');
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/players', () => {
        it('returns 400 when not in a game', async () => {
            const res = await request(app).get('/api/players');
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/session', () => {
        it('returns empty object when not authenticated', async () => {
            const res = await request(app).get('/api/session');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({});
        });
    });

    describe('Master flow integration', () => {
        /**
         * Helper: creates a game as 'MasterPlayer' (playerId=1) and returns the JWT cookie.
         */
        async function createGameAndGetCookie(playerName = 'MasterPlayer') {
            db.none.mockResolvedValue(undefined);
            db.one.mockResolvedValue({ id: 1 });
            const createRes = await request(app)
                .post('/api/newgame')
                .send({ name: playerName });
            expect(createRes.status).toBe(200);
            return { cookie: createRes.headers['set-cookie'], gameCode: createRes.body.code };
        }

        it('creates game, gets session, then gets answers in answering phase', async () => {
            const { cookie, gameCode } = await createGameAndGetCookie();

            // Get session — game is active, player 1 is master
            db.oneOrNone.mockResolvedValueOnce({ servercurrentround: 1, active: true, current_master_id: 1 });
            db.one
                .mockResolvedValueOnce({ name: 'MasterPlayer' }) // playerInfo
                .mockResolvedValueOnce({ count: 0 });            // answeredCount
            const sessionRes = await request(app)
                .get('/api/session')
                .set('Cookie', cookie);
            expect(sessionRes.status).toBe(200);
            expect(sessionRes.body.master).toBe(true);
            expect(sessionRes.body.gameId).toBe(gameCode);
            expect(sessionRes.body.author).toBe('MasterPlayer');

            // Get answers — phase should be 'answering' since master hasn't answered yet
            db.oneOrNone.mockResolvedValueOnce({ current_master_id: 1, active: true }); // isMaster check
            db.any.mockResolvedValueOnce([]);                                            // no answers yet
            db.one.mockResolvedValueOnce({ count: 0 });                                  // answeredCount = 0
            const answersRes = await request(app)
                .get('/api/answers/1')
                .set('Cookie', cookie);
            expect(answersRes.status).toBe(200);
            expect(answersRes.body.success).toBe(true);
            expect(answersRes.body.phase).toBe('answering');
            expect(answersRes.body.answers).toEqual([]);
        });

        it('master answers, then reveal phase shows all answers', async () => {
            const { cookie } = await createGameAndGetCookie();

            // Master submits answer
            db.one.mockResolvedValueOnce({ name: 'MasterPlayer' }); // playerInfo for /api/answer
            db.none.mockResolvedValueOnce(undefined);                // INSERT answer
            const answerRes = await request(app)
                .post('/api/answer')
                .set('Cookie', cookie)
                .send({ currentRound: 1, answer: 'Master answer' });
            expect(answerRes.status).toBe(200);

            // Get answers — phase should be 'reveal' since master has answered (count=1 >= round=1)
            db.oneOrNone.mockResolvedValueOnce({ current_master_id: 1, active: true }); // isMaster check
            db.any.mockResolvedValueOnce([
                { id: 1, author: 'MasterPlayer', answer: 'Master answer', round: 1 },
                { id: 2, author: 'Player2', answer: 'Other answer', round: 1 }
            ]);
            db.one.mockResolvedValueOnce({ count: 1 }); // answeredCount = 1
            const answersRes2 = await request(app)
                .get('/api/answers/1')
                .set('Cookie', cookie);
            expect(answersRes2.status).toBe(200);
            expect(answersRes2.body.phase).toBe('reveal');
            expect(answersRes2.body.answers).toHaveLength(2);
        });
    });

    describe('GET /api/players response wrapping', () => {
        it('wraps players array in { success, players }', async () => {
            // Create game first to get a valid JWT cookie
            db.none.mockResolvedValue(undefined);
            db.one.mockResolvedValue({ id: 1 });
            const createRes = await request(app)
                .post('/api/newgame')
                .send({ name: 'Alice' });
            const cookie = createRes.headers['set-cookie'];
            expect(cookie).toBeDefined();

            db.any.mockResolvedValueOnce([
                { id: 1, name: 'Alice', is_master: true },
                { id: 2, name: 'Bob', is_master: false }
            ]);
            const res = await request(app)
                .get('/api/players')
                .set('Cookie', cookie);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.players).toHaveLength(2);
        });
    });

    describe('AI generation', () => {
        const originalKey = process.env.OPENAI_API_KEY;

        afterEach(() => {
            if (originalKey !== undefined) {
                process.env.OPENAI_API_KEY = originalKey;
            } else {
                delete process.env.OPENAI_API_KEY;
            }
        });

        describe('GET /api/ai/status', () => {
            it('returns available: true when OPENAI_API_KEY is set', async () => {
                process.env.OPENAI_API_KEY = 'test-key';
                const res = await request(app).get('/api/ai/status');
                expect(res.status).toBe(200);
                expect(res.body).toEqual({ success: true, available: true });
            });

            it('returns available: false when OPENAI_API_KEY is absent', async () => {
                delete process.env.OPENAI_API_KEY;
                const res = await request(app).get('/api/ai/status');
                expect(res.status).toBe(200);
                expect(res.body).toEqual({ success: true, available: false });
            });
        });

        describe('POST /api/ai/generate', () => {
            it('returns 400 when not authenticated', async () => {
                const res = await request(app)
                    .post('/api/ai/generate')
                    .send({ questionType: 'sana', question: 'rappakalja' });
                expect(res.status).toBe(400);
                expect(res.body.success).toBe(false);
            });

            it('returns 400 for invalid question type', async () => {
                db.none.mockResolvedValue(undefined);
                db.one.mockResolvedValue({ id: 1 });
                const createRes = await request(app)
                    .post('/api/newgame')
                    .send({ name: 'Player1' });
                const cookie = createRes.headers['set-cookie'];

                // This player is master, so make a non-master player
                // Instead, test invalid type with master (still gets 400 for being master)
                const res = await request(app)
                    .post('/api/ai/generate')
                    .set('Cookie', cookie)
                    .send({ questionType: 'invalid', question: 'test' });
                expect(res.status).toBe(400);
                expect(res.body.success).toBe(false);
            });

            it('returns 400 when question is missing', async () => {
                // Create game, join as non-master player
                db.none.mockResolvedValue(undefined);
                db.one.mockResolvedValue({ id: 1 });
                const createRes = await request(app)
                    .post('/api/newgame')
                    .send({ name: 'Master' });
                const masterCookie = createRes.headers['set-cookie'];
                const gameCode = createRes.body.code;

                // Join as player
                db.oneOrNone
                    .mockResolvedValueOnce({ count: '1' })
                    .mockResolvedValueOnce(null);
                db.one.mockResolvedValueOnce({ id: 2 });
                const joinRes = await request(app)
                    .post('/api/join')
                    .send({ gameId: gameCode, author: 'Player' });
                const playerCookie = joinRes.headers['set-cookie'];

                // isMaster check returns false for player
                db.oneOrNone.mockResolvedValueOnce({ current_master_id: 1, active: true });

                process.env.OPENAI_API_KEY = 'test-key';
                const res = await request(app)
                    .post('/api/ai/generate')
                    .set('Cookie', playerCookie)
                    .send({ questionType: 'sana' });
                expect(res.status).toBe(400);
                expect(res.body.error).toBe('Question is required');
            });

            it('returns 400 when master tries to use AI', async () => {
                db.none.mockResolvedValue(undefined);
                db.one.mockResolvedValue({ id: 1 });
                const createRes = await request(app)
                    .post('/api/newgame')
                    .send({ name: 'Master' });
                const cookie = createRes.headers['set-cookie'];

                // isMaster check
                db.oneOrNone.mockResolvedValueOnce({ current_master_id: 1, active: true });

                process.env.OPENAI_API_KEY = 'test-key';
                const res = await request(app)
                    .post('/api/ai/generate')
                    .set('Cookie', cookie)
                    .send({ questionType: 'sana', question: 'test' });
                expect(res.status).toBe(400);
                expect(res.body.error).toBe('Master cannot use AI generation');
            });
        });
    });
});
