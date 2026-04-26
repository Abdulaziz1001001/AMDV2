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

## Deploy on Render

Use a **Web Service** whose **Root Directory** is `backend` (this repo). The backend `build` script installs frontend dependencies, runs the Vite production build, then installs backend dependencies; `start` runs `node server.js`. Render sets `PORT` automatically.

### Required environment variables

Set these in the Render dashboard (**Environment**) for that service:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string (required). Atlas: use **Drivers** connection string after entering the DB user password. |
| `JWT_SECRET` | Random secret, **at least 32 characters**. |
| `FRONTEND_ORIGIN` | Allowed browser origins (comma-separated), e.g. `https://your-service.onrender.com`. |

Also set any options you use locally (`ADMIN_BOOTSTRAP_PASSWORD`, `LOG_LEVEL`, etc.). After changing secrets, trigger a **manual deploy** so the service picks them up.

### Troubleshooting MongoDB Atlas: `bad auth : authentication failed`

The build can succeed while the app **crashes on startup** if Atlas rejects credentials. Common causes:

1. **Stale or wrong password** — In Atlas **Database Access**, confirm the database user exists. If you reset the password, paste the **new** connection string (or update `MONGO_URI` on Render with the same password).

2. **Wrong user type** — The URI must use a **database user** from Atlas **Database Access**, not your Atlas account email/password.

3. **Special characters in the password** — Characters like `@`, `:`, `/`, `#`, `?`, `%` must be **percent-encoded** inside the URI. Prefer **Connect → Drivers** in Atlas, enter the password when prompted, and copy the generated string.

4. **Typo / cluster mismatch** — Hostname must match your cluster (`*.mongodb.net`). No accidental spaces before or after `MONGO_URI` in Render.

5. **Network Access** — Under **Network Access**, allow **`0.0.0.0/0`** (or your host’s egress rules) while testing connection issues.

### Verify `MONGO_URI` locally

Use the **exact** string from Render (same quoting, no trailing newline):

```bash
# PowerShell
$env:MONGO_URI="<paste-uri-here>"
node -e "require('mongoose').connect(process.env.MONGO_URI).then(()=>console.log('MongoDB OK')).catch(e=>console.error(e))"
```

```bash
# Unix
export MONGO_URI='<paste-uri-here>'
node -e "require('mongoose').connect(process.env.MONGO_URI).then(()=>console.log('MongoDB OK')).catch(e=>console.error(e))"
```

If this fails locally, fix Atlas credentials or encoding before redeploying Render.

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
