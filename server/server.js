import { createServer } from 'http';
import pgPromise from 'pg-promise';
import { createApp } from './app.js';
import { initSocket } from './socket.js';

const pgp = pgPromise();

// Support Fly.io DATABASE_URL or individual PG* env vars
const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 20 }
    : { max: 20, host: process.env.PGHOST || 'localhost' };

const db = pgp(connectionConfig);

const app = createApp(db);
const httpServer = createServer(app);
const io = initSocket(httpServer);

// Attach io to app so routes can emit events
app.set('io', io);

httpServer.listen(process.env.PORT || 8080);
