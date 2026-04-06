# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rappakalja is a real-time multiplayer board game helper app. A game master creates a room (gets a 5-char alphanumeric code), players join with that code, submit answers each round, and the master reveals answers and advances rounds. In V2 the master is also a player who answers first (two-phase reveal), can pass the master role to another player, and all clients receive real-time updates via WebSockets.

## Commands

- **Frontend dev server:** `npm run dev` (Vite dev server on port 3000, proxies `/api` to port 8080)
- **Backend dev server:** `npm run dev:server` (nodemon with auto-reload)
- **Build frontend:** `npm run build` (Vite production build → `dist/`)
- **Production start:** `npm start` (runs `node server/server.js`)
- **Lint:** `npm run lint`
- **Tests:** `npm test` (Vitest, run once) / `npm run test:watch` (Vitest watch mode)
- **DB migrations:** `npm run migrate -- up` (dev) / `npm run prod-migrate` (prod)
- **Docker:** `docker-compose up` (starts app + PostgreSQL)
- **Deploy to Fly.io:** `npm run fly:deploy`

Required env vars: `APP_SECRET` (JWT signing key, min 32 chars). For PostgreSQL: `DATABASE_URL` (Fly.io style) **or** `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`. Optional: `OPENAI_API_KEY` (enables AI-generated answers for players).

## Architecture

**Express 5 server** — The app is created via a `createApp(db)` factory in `server/app.js`, keeping the HTTP server and socket wiring in `server/server.js`. This enables dependency injection for tests. Uses cookie-parser + JWT (jose) for auth; cookie-session has been removed. `express.json()` handles request bodies.

**JWT auth** (`server/jwt.js`, `server/authMiddleware.js`) — HS256 tokens signed with `APP_SECRET`, stored in an httpOnly `token` cookie (24h expiry). `authMiddleware` attaches `req.player` (`{ playerId, gameCode }` or `null`) and the helpers `req.setToken(payload)` / `req.clearToken()` to every request.

**WebSockets** (`server/socket.js`) — socket.io v4 over the same HTTP server. Clients authenticate via the JWT cookie on connection and are auto-joined to their game room (`game:<code>`). The server emits events from REST route handlers via `app.get('io')`.

**React 19 frontend** (`src/`) — functional components with hooks, React Router v6. No Redux. Real-time updates via `src/hooks/useSocket.js` (wraps socket.io-client). REST is still used for all mutations.

**Tailwind CSS v4** via `@tailwindcss/vite`. Bootstrap removed. shadcn/ui-style primitive components live in `src/components/ui/`.

## File Structure

```
server/
  app.js             — createApp(db) factory; all API routes
  server.js          — HTTP server, DB connection, socket wiring
  socket.js          — socket.io init + JWT auth middleware for sockets
  jwt.js             — createToken / verifyToken (jose, HS256)
  authMiddleware.js  — Express middleware; populates req.player

src/
  index.jsx          — Router setup, Home component (join/create)
  Game.jsx           — Master view (answers, shuffle, next round, end game)
  Answer.jsx         — Player view (submit answer, wait between rounds)
  components/ui/     — Primitive UI components (button, card, input, textarea, badge)
  hooks/
    useSocket.js     — socket.io-client hook; joins game room, handles events
  lib/
    utils.js         — cn() helper (clsx + tailwind-merge)
  utils/
    api.js           — Fetch helpers: json(), post(), del() with credentials:'same-origin'
    socket.js        — socket.io-client singleton

migrations/
  *.cjs              — db-migrate files (CommonJS, project root is ESM)
  sqls/              — SQL up/down files
```

## Database Schema

Three tables (PostgreSQL):

- **games** — `code` (PK text), `currentround` (int), `active` (bool), `current_master_id` (FK → players.id, ON DELETE SET NULL)
- **answers** — `gamecode`, `round`, `author`, `answer`; UNIQUE constraint on `(gamecode, round, author)`
- **players** — `id` (serial PK), `game_code` (text), `name` (text), `is_master` (bool), `created_at`; UNIQUE on `(game_code, name)`

The master is tracked in `games.current_master_id` (not in the session). The master role can be transferred to any player via `POST /api/nextround`.

## API Endpoints

All endpoints return `{ success: true, ... }` or `{ success: false, error: "..." }`.

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| GET | `/api/game/:id` | — | Check if a game code exists |
| POST | `/api/newgame` | — | Create game; body: `{ name }`. Sets JWT cookie. |
| POST | `/api/join` | — | Join game; body: `{ gameId, author }`. Sets JWT cookie. |
| POST | `/api/answer` | player | Submit answer; body: `{ answer, currentRound }` |
| GET | `/api/answers/:round` | master | Get round answers (empty until master has answered — two-phase). Returns `{ answers, phase, masterAnswered, totalAnswers }` |
| POST | `/api/nextround` | master | Advance round; optional body: `{ nextMasterId }` to transfer master role |
| GET | `/api/players` | player | List players in game: `{ players: [{ id, name, is_master }] }` |
| GET | `/api/session` | — | Current player session state (empty `{}` if not in a game) |
| POST | `/api/session/del` | — | Master: ends game. Player: leaves game. |
| GET | `/api/health` | — | Health check for Fly.io; returns `{ status: "ok" }` |
| GET | `/api/ai/status` | — | Check if AI generation is available: `{ available: bool }` |
| POST | `/api/ai/generate` | player (not master) | Generate AI answer; body: `{ questionType, question }`. Types: `sana`, `henkilö`, `elokuvakäsikirjoitus`, `lyhenne`, `laki`. Rate limited (10s). |
| POST | `/api/ai/generate-question` | master | Generate question + real answer; body: `{ questionType }`. Returns `{ question, answer }`. Rate limited (5s). |

## WebSocket Events (server → client)

All events are scoped to the player's game room (`game:<code>`).

| Event | Trigger |
|-------|---------|
| `answers:updated` | A new answer is submitted |
| `round:advanced` | Round number incremented |
| `master:changed` | Master role transferred; payload: `{ newMasterId }` |
| `players:updated` | Player joins or leaves |
| `game:ended` | Master ends the game |

Clients connect authenticated (JWT cookie). Unauthenticated sockets are rejected.

## Testing

Tests use **Vitest** + **supertest** (server integration) + **@testing-library/react** (components). The `createApp(db)` factory makes it easy to pass a mock/test DB instance. Test files live in `src/test/`.

Run with `npm test` (single pass) or `npm run test:watch`.

## Deployment (Fly.io)

`fly.toml` targets region `arn`, internal port 8080, HTTPS enforced. Health checks poll `GET /api/health` every 30s. Multi-stage Dockerfile handles the build. Postgres is provided via `DATABASE_URL`. `APP_SECRET` must be set as a Fly secret.

```
fly secrets set APP_SECRET=<32+ char secret>
npm run fly:deploy
```

## Code Style

- ESLint 9 flat config (`eslint.config.js`) — covers both `src/` and `server/`
- Plugins: `eslint-plugin-react`, `eslint-plugin-react-hooks`
- 4-space indentation, single quotes, semicolons required
- `no-var`, `prefer-const`, `eqeqeq` enforced
- Max line length: 160 chars
- `react/react-in-jsx-scope` and `react/prop-types` disabled
- Entire project uses ESM (`"type": "module"`); migration files use `.cjs` exception
