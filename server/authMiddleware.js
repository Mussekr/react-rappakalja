import { verifyToken, createToken } from './jwt.js';

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
};

/**
 * Middleware that reads JWT from cookie, verifies it, and attaches
 * `req.player` with { playerId, gameCode } or null.
 * Also attaches `req.setToken(payload)` and `req.clearToken()` helpers.
 */
export function authMiddleware(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];

    const setToken = async (payload) => {
        const jwt = await createToken(payload);
        res.cookie(COOKIE_NAME, jwt, COOKIE_OPTIONS);
    };

    const clearToken = () => {
        res.clearCookie(COOKIE_NAME, { path: '/' });
    };

    req.setToken = setToken;
    req.clearToken = clearToken;

    if (!token) {
        req.player = null;
        next();
        return;
    }

    // verifyToken never rejects — it returns null on any failure
    verifyToken(token).then(payload => {
        req.player = payload; // { playerId, gameCode } or null
        next();
    });
}
