# AMD Attendance

Attendance management app: Express + MongoDB API under `backend/`, static web UI (`index.html` + `assets/`).

## Requirements

- Node.js 20+
- MongoDB (local or Atlas)

## Backend setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

- Set `MONGO_URI` to your MongoDB connection string.
- Set `JWT_SECRET` to a random string **at least 32 characters** long.
- Set `FRONTEND_ORIGIN` to the origins that will load the UI (comma-separated). Example: `http://127.0.0.1:5500,http://localhost:5500`.
- For the first run with an empty database, set `ADMIN_BOOTSTRAP_PASSWORD` (minimum 8 characters) so a bootstrap admin account is created. Remove or rotate after onboarding.

Optional:

- `PUBLIC_API_BASE` — full API base URL ending in `/api` when the UI is hosted on a **different** origin than the API. Leave empty if you serve the UI from the same server (recommended).
- `ENABLE_KEEPALIVE=true` and `SELF_URL=https://your-host/health` — only if you need self-pings (e.g. free-tier sleep).

Install and run:

```bash
npm install
npm run dev
```

Production:

```bash
npm start
```

The server listens on `PORT` (default `5000`), serves `index.html` at `/`, static files from the repo root, and exposes `/health` for uptime checks.

## Frontend

**Recommended:** open the app through the backend (e.g. `http://127.0.0.1:5000/`) so `/api`, `/app-config.js`, and `/assets/js/http.js` share one origin.

**Alternative:** open `index.html` via a local static server (e.g. Live Server). You must list that server’s origin in `FRONTEND_ORIGIN`, and set `PUBLIC_API_BASE` in `.env` to your API URL (e.g. `http://127.0.0.1:5000/api`) so the browser can reach the API.

## Tests

From `backend/`:

```bash
npm test
```

Uses the Node.js built-in test runner, Supertest, and mongodb-memory-server.

## API security notes

- `/api/admin/*` and `/api/employee/*` require a `Authorization: Bearer <jwt>` header from login.
- Employees can only submit attendance records for their own `employeeId`.
- Auth routes are rate-limited (see `AUTH_RATE_LIMIT_MAX` in `.env.example`).
