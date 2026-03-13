import { Server } from 'socket.io';
import { parse as parseCookies } from 'cookie';
import { verifyToken } from './jwt.js';

/**
 * Initializes socket.io on the given HTTP server.
 * Returns the io instance so routes can emit events.
 *
 * Events emitted to game rooms:
 * - 'answers:updated' — when a new answer is submitted
 * - 'round:advanced'  — when round changes
 * - 'players:updated' — when a player joins or leaves
 * - 'game:ended'      — when the game is ended
 * - 'master:changed'  — when master role transfers
 */
export function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000',
            credentials: true
        }
    });

    // Auth middleware — verify JWT from cookie using the `cookie` npm package (not regex)
    io.use(async (socket, next) => {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) {
            return next(new Error('No auth cookie'));
        }

        const cookies = parseCookies(cookieHeader);
        const token = cookies['token'];
        if (!token) {
            return next(new Error('No token cookie'));
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return next(new Error('Invalid token'));
        }

        socket.player = payload;
        next();
    });

    io.on('connection', (socket) => {
        const { gameCode } = socket.player;
        if (gameCode) {
            socket.join(`game:${gameCode}`);
        }
        // Room cleanup on disconnect is handled automatically by socket.io
    });

    return io;
}
