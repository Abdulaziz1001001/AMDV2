# AMD Attendance

Attendance management app: Express + MongoDB API under `backend/` and React + Vite frontend under `frontend/`.

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
- Set `FRONTEND_ORIGIN` to allowed browser origins (comma-separated). Example: `http://127.0.0.1:5173,http://localhost:5173`.
- For the first run with an empty database, set `ADMIN_BOOTSTRAP_PASSWORD` (minimum 8 characters) so a bootstrap admin account is created. Remove or rotate after onboarding.
- Optional: `ENABLE_KEEPALIVE=true` and `SELF_URL=https://your-host/health` if you need self-pings.

Install and run backend:

```bash
cd backend
npm install
npm run dev
```

The server listens on `PORT` (default `5000`), serves built frontend from `frontend/dist`, and exposes `/health`.

## Frontend (React + Vite)

Development UI:

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
cd frontend
npm run build
```

Then start backend (`cd backend && npm start`) and open `http://127.0.0.1:5000/`.

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
