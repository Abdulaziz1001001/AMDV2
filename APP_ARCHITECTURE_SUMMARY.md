# AMD United — Application Architecture Summary (Updated)

Current static analysis of the **AMDV2** workspace (April 2026): single-page **Vite + React** frontend, **Express + MongoDB (Mongoose)** backend, JWT auth, role-gated APIs, and a shared admin data hydration flow via `/api/admin/all-data`.

---

## 1. Tech Stack & Runtime

### 1.1 Backend (`backend/`)

- **Runtime / Framework:** Node.js + Express 4 (CommonJS)
- **Database:** MongoDB via Mongoose 7
- **Auth:** `jsonwebtoken` + `bcryptjs`
- **Validation:** Zod (`middleware/validation.js`)
- **Observability / HTTP controls:** `pino`, `pino-http`, `cors`, `express-rate-limit`
- **Files / notifications:** `multer`, `nodemailer`
- **Entry points:** `server.js` (DB connection + bootstrap admin + `listen`), `app.js` (`createApp()`)
- **Build flow:** backend `build` script runs frontend build first, then backend install

Backend-required/critical env observed in code:
- `MONGO_URI` (required at boot)
- `JWT_SECRET` (required, min length 32 enforced)
- `FRONTEND_ORIGIN` (optional CORS allowlist, comma-separated)
- `ADMIN_BOOTSTRAP_USERNAME`, `ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_BOOTSTRAP_NAME` (optional first-admin bootstrap)
- `PORT` (default `5000`)
- `ENABLE_KEEPALIVE`, `SELF_URL` (optional self-ping loop)

### 1.2 Frontend (`frontend/`)

- **Build:** Vite 8 + TypeScript 6 + `@vitejs/plugin-react`
- **UI / styling:** Tailwind CSS 4 (`@tailwindcss/vite`) + Radix primitives + `class-variance-authority`, `clsx`, `tailwind-merge`
- **Core libs:** `framer-motion`, `@tanstack/react-table`, `recharts`, `leaflet`/`react-leaflet`, `jspdf`/`xlsx`, `lucide-react`
- **State approach:** React Context only (`AuthContext`, `DataContext`, `AdminNavContext`, `LangContext`, `ThemeContext`)
- **Not used:** Redux / Zustand / TanStack Query / React Router

---

## 2. High-Level Structure

```txt
AMDV2/
├── backend/
│   ├── app.js                 # Express app factory, route mounting, static SPA fallback
│   ├── server.js              # Mongo connect, optional admin bootstrap, server listen
│   ├── controllers/           # Auth + attendance controller logic
│   ├── middleware/            # JWT auth, role guard, Zod validation
│   ├── models/                # Mongoose schemas
│   ├── routes/                # API routers under /api/*
│   ├── lib/                   # Domain utilities (audit, notifications, policy helpers, etc.)
│   └── test/                  # Node test runner integration tests
├── frontend/
│   ├── src/api/               # API wrappers
│   ├── src/pages/             # Admin + employee screen modules
│   ├── src/components/        # Layout + UI primitives + map/chart components
│   ├── src/stores/            # React context providers
│   ├── src/lib/               # Shared helpers (format/export/calendar/org tree)
│   └── src/i18n/              # EN / AR dictionary sets
└── APP_ARCHITECTURE_SUMMARY.md
```

---

## 3. Database Model Inventory (MongoDB / Mongoose)

### 3.1 Identity and org

- `Admin`: admin credentials/profile
- `Employee`: employee account + HR profile fields + payroll/leave fields
- `Department`: org unit with `managerId`
- `Group`: scheduling/policy grouping
- `Location`: check-in geofence (lat/lng/radius + allowed groups)
- `User`: generic role model present in codebase (not primary auth path)

### 3.2 Attendance and scheduling

- `Record`: attendance record with unique `{ employeeId, date }`, geo fields, approval status, breaks, overtime minutes, project/location linkage
- `EarlyCheckout`: early leave requests linked to attendance record
- `Overtime`: overtime submissions and approvals
- `Shift`: shift definitions
- `ShiftAssignment`: per-employee per-day assignment with unique `{ employeeId, date }`
- `Project`: project/site entities with optional geofence + manager linkage

### 3.3 HR policy and workflows

- `LeaveRequest`: leave workflow with status history/approval metadata
- `WorkPolicy`: company-level policy document (holidays, grace, accrual, approvals, onboarding/offboarding lists)
- `EmployeeDocument`: uploaded employee docs metadata
- `ProfileUpdateRequest`: employee profile update approval flow
- `OnboardingChecklist`: onboarding checklist tracking
- `Announcement`: org announcements (EN/AR, targeting, pin/expiry)
- `SafetyIncident`: incident workflow with optional photos/project context

### 3.4 Operations and audit

- `AuditLog`: actor/action/target audit entries
- `AdminNotification`: admin notification feed with read tracking and refs

---

## 4. API Surface (Mounted Routers)

All APIs are mounted under `/api` in `backend/app.js`.

- `/api/auth`: login endpoints (`admin-login`, `emp-login`) with rate limiting
- `/api/admin`: admin-only operations (`all-data`, employees/groups/locations/departments CRUD, work policy, payroll overview, records and leave actions, admin notifications, admin profile/credentials)
- `/api/employee`: employee/manager attendance endpoints (`records`, `me-data`, `record`)
- `/api/hr`: employee self-service + manager department leave approvals + employee notifications
- `/api/checkouts`: early checkout submit/list/approve
- `/api/overtime`: overtime submit/list/action
- `/api/shifts`: shift CRUD + assignment + my-shift
- `/api/projects`: project CRUD/report with role restrictions
- `/api/attendance`: day-close, break start/end, attendance report
- `/api/audit`: audit log read endpoint (admin)
- `/api/announcements`: list/create/delete announcements
- `/api/onboarding`: onboarding checklist operations
- `/api/self-service`: profile updates + document upload/list/download/delete + expiring docs
- `/api/safety`: incident create/list/update/photo/delete
- `/api/leave-accrual`: balances, run accrual, carry-forward report, encash
- `/api/directory`: employee directory + org chart

Other HTTP behavior:
- `GET /health` returns `ok`
- If `frontend/dist` exists, Express serves SPA assets + index fallback
- If missing, non-API routes return `503` “Frontend build missing”

---

## 5. Frontend Architecture

### 5.1 App-level flow

`App.tsx` branches by auth state (no URL router):
- `home` → landing page
- unauthenticated `admin` → admin login
- unauthenticated `employee` → employee login
- authenticated `admin` → `DataProvider` + `AdminNavProvider` + `PageShell`
- authenticated `employee`/`manager` → `Portal`

### 5.2 Admin workspace

`PageShell` lazy-loads panel modules by `AdminNavContext.activePanel`.

Panels currently wired:
- `dashboard`, `analytics`, `employees`, `groups`, `departments`, `locations`
- `calendar`, `records`, `hr`, `onboarding`, `announcements`, `safety`
- `directory`, `accrual`, `audit`, `reports`, `settings`

Admin boot flow hydrates `DataContext` from `/api/admin/all-data` and supports manual refresh/sync.

### 5.3 Employee/manager workspace

`Portal` tabbed interface:
- Employee: `attendance`, `hr`, `notifications`
- Manager: same tabs + `team`

Also includes theme/language toggles and notification popover UX.

### 5.4 Data fetching pattern

- Shared `request()` wrapper (`src/api/client.ts`) with `/api` base
- JWT from `localStorage` (`amd_token`) added as `Bearer` header
- Unauthorized responses clear session and return user to home flow
- Multipart uploads supported via dedicated upload helper calls

---

## 6. Core Implemented Business Flows

1. **Admin auth and session restore** via `/api/auth/admin-login` and `/api/admin/me`.
2. **Employee/manager auth** via `/api/auth/emp-login`, role derived by department-manager relationship.
3. **Attendance upsert** via `/api/employee/record`, plus break start/end and admin close-day.
4. **Leave lifecycle**: employee request + manager/admin approval paths.
5. **Early checkout and overtime workflows** with manager/admin actions.
6. **HR self-service**: profile update requests + document vault operations.
7. **Admin operations**: notifications, payroll overview, audit review, accrual operations, reports.
8. **Safety / onboarding / announcements / directory** feature modules exposed in both backend and admin UI.

---

## 7. Current Observations

- Backend remains JavaScript (`.js`), frontend is TypeScript (`.ts`/`.tsx`).
- Architecture is monorepo-style but deployable as single Express host serving API + built SPA.
- State management is intentionally lightweight and context-driven.

---

*Generated from current repository static analysis. Validate in runtime environment for env-dependent behavior and data assumptions.*
