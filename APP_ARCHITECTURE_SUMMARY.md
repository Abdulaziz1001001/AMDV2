# AMD United — Application Architecture Summary

Static analysis of the **AMDV2** workspace: single-page **Vite + React** frontend, **Express + MongoDB (Mongoose)** backend, JWT auth, and role-gated APIs. This document omits boilerplate and focuses on structure, data, routing, and control flow.

---

## 1. Tech Stack & Configuration

### 1.1 Backend (`backend/package.json`)

| Area | Packages / notes |
|------|------------------|
| **Runtime** | Node.js, **Express 4** |
| **Database** | **Mongoose 7** → MongoDB |
| **Auth** | **jsonwebtoken**, **bcryptjs** |
| **Validation** | **Zod 3** (see `middleware/validation.js`) |
| **HTTP** | **cors**, **express-rate-limit** (auth routes), **pino** + **pino-http** (request logging) |
| **Uploads** | **multer** |
| **Email** | **nodemailer** (used in HR notification helpers) |
| **Other** | **dotenv**; **node-cron** is a declared dependency (not referenced in first-party `*.js` at time of analysis) |
| **Entry** | `server.js` (connects DB, optional bootstrap admin, `app.listen`); `app.js` exports `createApp()` |
| **Build** | `build` script builds the **frontend** into `frontend/dist` and installs backend deps |

**Critical env (from code):** `MONGO_URI`, `JWT_SECRET` (≥32 chars enforced in `app.js`), optional `FRONTEND_ORIGIN`, `ADMIN_BOOTSTRAP_USERNAME` / `ADMIN_BOOTSTRAP_PASSWORD` / `ADMIN_BOOTSTRAP_NAME`, `PORT` (default 5000).

### 1.2 Frontend (`frontend/package.json`)

| Area | Packages / notes |
|------|------------------|
| **Build** | **Vite 8**, **TypeScript 6**, **@vitejs/plugin-react** |
| **UI styling** | **Tailwind CSS 4** via **`@tailwindcss/vite`** |
| **Components** | **Radix UI** (dialog, dropdown, popover, select, tabs, toast, tooltip, checkbox, switch) — **not** the full shadcn/ui CLI scaffold; patterns align with “shadcn-style” stacks (**class-variance-authority**, **tailwind-merge**, **clsx**) |
| **Icons** | **lucide-react** |
| **Tables / charts** | **@tanstack/react-table**, **recharts** |
| **Motion** | **framer-motion** |
| **Maps** | **leaflet**, **react-leaflet** |
| **Exports** | **jspdf**, **jspdf-autotable**, **xlsx** |
| **Lint** | ESLint 9 + **typescript-eslint**, **eslint-plugin-react-hooks**, **eslint-plugin-react-refresh** |

**Global state:** React **Context** only (`AuthContext`, `DataContext`, `AdminNavContext`, `LangContext`, `ThemeContext`) — **no Redux**, **no TanStack Query**.

---

## 2. Folder Structure (High Level)

```
AMDV2/
├── backend/
│   ├── app.js                 # Express factory: middleware, `/api/*` mounts, SPA static fallback
│   ├── server.js              # Mongo connect, bootstrap admin, HTTP server
│   ├── controllers/           # authController, attendanceController (fat route handlers elsewhere)
│   ├── middleware/            # JWT auth + role guard; Zod validation helpers
│   ├── models/                # Mongoose schemas (single source of DB truth)
│   ├── routes/                # Express routers per domain (mounted under `/api/...`)
│   ├── lib/                   # audit logging, notifications, calendar helpers, MIME, work-policy seed
│   └── test/                  # Integration tests (auth, middleware)
├── frontend/
│   ├── public/                # Static assets (e.g. logos)
│   ├── src/
│   │   ├── api/               # fetch wrappers (`client.ts`, `auth.ts`, `admin.ts`, …)
│   │   ├── components/        # layout (PageShell, Sidebar), ui primitives, maps
│   │   ├── pages/             # route-less “screens”: auth, admin/*, employee/*
│   │   ├── stores/            # React contexts (auth, data, theme, language, admin nav)
│   │   ├── lib/               # cn, formatters, export helpers
│   │   └── i18n/              # EN (and AR keys via LangContext)
│   └── vite.config.ts         # `@` → `./src`, dev proxy `/api` → `localhost:5000`
└── (private_uploads/ etc. may exist at runtime for uploads — referenced in HR routes)
```

**Separation:** Backend owns persistence, authorization, and business rules; frontend owns UI, client-side formatting, and JWT storage. Admin bulk data is loaded via **`GET /api/admin/all-data`** into **`DataContext.sync()`**.

---

## 3. Database Architecture (MongoDB / Mongoose)

### 3.1 Identity & org

| Collection (model) | Purpose | Key fields & relationships |
|--------------------|---------|----------------------------|
| **admins** (`Admin`) | Admin portal users | `username` (unique), bcrypt `password`, `name`, `email` |
| **employees** (`Employee`) | Workforce + login | `username` (unique), `password`, `name`, `eid`, `groupId`, `departmentId` → **departments**, `workStart`/`workEnd`, `salary`, `active` (default **true**), `leaveBalance` (default **0**), `lastAccrualDate`, `emergencyContact`, … |
| **departments** (`Department`) | Org units | `name`, `managerId` → **employees** |
| **groups** (`Group`) | Scheduling / policy grouping | `name`, `weekendDays`, `ignoreCompanyHolidays`, `extraNonWorkDates`, `color` |
| **users** (`User`) | Generic user schema (`admin`/`manager`/`employee`) | **Present in codebase but no `require('./models/User')` in routes — effectively unused vs `Employee`/`Admin`** |

### 3.2 Attendance & time

| Collection | Purpose | Notes |
|------------|---------|--------|
| **records** (`Record` / `AttendanceRecord`) | Daily attendance rows | **`AttendanceRecord`** uses `collection: 'records'` and **unique** `{ employeeId, date }`. Fields: ISO date string `date`, optional check-in/out ISO strings, lat/lng, `status` (default **`present`**), `approvalStatus` enum default **`none`**, `breaks[]`, `overtimeMinutes` (default **0**), `projectId`, etc. **`Record`** model duplicates shape for legacy reads/writes. |
| **earlycheckouts** (`EarlyCheckout`) | Early leave requests | `employeeId`, `attendanceId` → **Record**, `checkoutTime`, `reason`, `status` **`pending`/`approved`/`declined`** |
| **overtimes** (`Overtime`) | OT claims | `employeeId`, optional `attendanceId`, `date`, `extraMinutes`, `reason`, `status`, `rateMultiplier` (default **1.5**) |
| **shifts** / **shiftassignments** (`Shift`, `ShiftAssignment`) | Named shifts + per-day assignment | Assignment **unique** on `{ employeeId, date }` |

### 3.3 HR & policy

| Collection | Purpose | Notes |
|------------|---------|--------|
| **leaverequests** (`LeaveRequest`) | Leave workflow | `employeeId` → Employee, `startDate`/`endDate`, `type` (fixed **LEAVE_TYPES** enum), `status` includes `pending`, `approved`, `rejected`, `supervisor_approved`, `hr_approved`, `requestedDays`, `attachmentUrl`, `approvalHistory[]`, … |
| **workpolicies** (`WorkPolicy`) | Singleton-style config (`key: 'company'`) | Timezone default **Asia/Riyadh**, weekend days, holidays, grace minutes, approval chains, **leaveAccrual** subdoc (defaults for accrual engine), onboarding/offboarding item lists |
| **announcements** (`Announcement`) | Internal comms | `title`/`body` (+ AR), `targetType`, `expiresAt`, `pinned` |
| **safetyincidents** (`SafetyIncident`) | Safety tickets | `reporterId`, `severity`, `status`, `photos[]`, optional `projectId` |
| **onboardingchecklists** (`OnboardingChecklist`) | Checklist tracking | Used by onboarding routes |
| **employeedocuments** (`EmployeeDocument`) | Vault metadata | Category enum, `filename`, `expiresAt`, `uploadedByRole` |
| **profileupdaterequests** (`ProfileUpdateRequest`) | Self-service profile changes | Admin approval flow |

### 3.4 Ops & audit

| Collection | Purpose |
|------------|---------|
| **auditlogs** (`AuditLog`) | Actor, action, target, optional before/after payloads |
| **adminnotifications** (`AdminNotification`) | In-app admin feed; `readAt`, `ref.kind` / `ref.id` |
| **projects** (`Project`) | Sites / jobs; geofence-style `lat`/`lng`/`radius`, `managerId` |

**Relationships (summary):** Employees are the hub → departments, records, leave, OT, early checkout, safety, documents. **Record** rows link to optional **Project**. **Admin** is separate from **Employee**.

---

## 4. API Routing Map (Express)

**Global prefix:** all JSON APIs under **`/api`** (see `backend/app.js`).

**Cross-cutting middleware:**

- **`authMiddleware`**: `Authorization: Bearer <JWT>` → sets `req.user` `{ id, role }`.
- **`requireRole('admin' | ['employee','manager'] | …)`**: **403** if role not allowed.
- **`validateBody` / `validateQuery` (Zod)**: **400** with first field error message.
- **`authLimiter`**: rate limit on **`/api/auth`** only.

**Mounted routers & protection (abbrev.):**

| Mount path | Router file | Auth | Role highlights |
|------------|-------------|------|-----------------|
| `/api/auth` | `routes/auth.js` | No JWT (login only) | **POST** `/admin-login`, `/emp-login` + Zod login schema; rate-limited |
| `/api/admin` | `routes/admin.js` | **Yes** | **All routes:** `admin`. Bulk **`GET /all-data`**, CRUD employees/groups/locations/departments, work policy, leave patch, payroll overview, notifications, record approval, etc. |
| `/api/employee` | `routes/employee.js` | **Yes** | **`employee` + `manager`**: **`GET /records`**, **`GET /me-data`**, **`POST /record`** (Zod `attendanceUpsertSchema`) → upsert attendance |
| `/api/hr` | `routes/hr.js` | **Yes** | Mixed: **`/me/*`** → employee+manager; **`/department/*`** → manager (+ admin on some); attachments via multer (PDF/images); **`/me/notifications`** for employee notifications |
| `/api/checkouts` | `routes/earlyCheckout.js` | **Yes** | Submit early checkout: employee+manager; approve: admin+manager |
| `/api/overtime` | `routes/overtime.js` | **Yes** | Create: employee+manager; list: authenticated; **`PUT /:id/action`**: admin+manager |
| `/api/shifts` | `routes/shifts.js` | **Yes** | CRUD / assign mostly **admin**; **`/my-shift`**: employee+manager |
| `/api/projects` | `routes/projects.js` | **Yes** | Read for authed users; mutate/report restricted by role |
| `/api/attendance` | `routes/attendance.js` + controller | **Yes** | **`close-day`**: **admin**; breaks: employee+manager; **`GET /report`**: admin+manager |
| `/api/audit` | `routes/audit.js` | **Yes** | **admin** only |
| `/api/announcements` | `routes/announcements.js` | **Yes** | **GET /** all authed; **POST/DELETE** **admin** |
| `/api/onboarding` | `routes/onboarding.js` | **Yes** | **admin** |
| `/api/self-service` | `routes/selfService.js` | **Yes** | Profile updates & documents (multer); some endpoints **admin** |
| `/api/safety` | `routes/safety.js` | **Yes** | Create/read photos; update **admin/manager**; delete **admin** |
| `/api/leave-accrual` | `routes/leaveAccrual.js` | **Yes** | Balances: admin+manager; run accrual / encash / reports: **admin** |
| `/api/directory` | `routes/directory.js` | **Yes** | Org listing / org chart |

**Non-API:** **`GET /health`** → `ok`. If `frontend/dist` exists, **`express.static`** + SPA **`index.html`** fallback; otherwise non-API routes may return **503** “Frontend build missing”.

---

## 5. Frontend Architecture

### 5.1 Routing strategy

**No React Router.** `App.tsx` chooses the tree from **`AuthContext`**:

| Condition | UI |
|-----------|-----|
| `page === 'home'` | `Home` (landing) |
| `page === 'admin'` && no role | `AdminLogin` |
| `page === 'employee'` && no role | `EmployeeLogin` |
| `role === 'admin'` | `DataProvider` → `AdminNavProvider` → **`PageShell`** (single admin workspace) |
| else | **`Portal`** (employee app shell) |

Admin “routing” is **`AdminNavContext.activePanel`** + lazy-loaded panels inside **`PageShell`** (not URL-segment routing).

### 5.2 Data fetching

- **`fetch`** wrapper in **`src/api/client.ts`**: base URL **`/api`**, JSON body, attaches **`Bearer`** from **`localStorage.amd_token`**.
- **401** → clears token/role, dispatches **`amd-unauthorized`**, **`AuthContext`** resets to home.
- **No Axios; no React Query** — admin lists depend on **`fetchAllData()`** (`/admin/all-data`) and **`sync()`** in **`DataContext`**.
- File uploads: **`upload()`** in same module (multipart, no `Content-Type` header).

### 5.3 Layout & theme

- **`ThemeProvider`**: `light`/`dark`, persists **`amd_theme`**, toggles **`document.documentElement.classList.dark`** (Tailwind dark variant).
- **`LangProvider`**: i18n strings (e.g. EN/AR), used in admin chrome.
- **`ToastProvider`**: global toasts.
- Admin layout: **`Sidebar`** + **`Topbar`** + animated main content in **`PageShell`**.

---

## 6. Current Known Workflows

### 6.1 Admin login

1. User submits credentials on **`AdminLogin`** → **`POST /api/auth/admin-login`** (Zod-validated).
2. Server validates **`Admin`** with **bcrypt**, issues JWT **`{ id, role: 'admin' }`**, **`exp` ~1d**.
3. Frontend stores **`amd_token`**, **`amd_role`**, sets session in **`AuthContext`** → **`PageShell`**.
4. **`PageShell`** **`useEffect`** calls **`sync()`** → **`GET /api/admin/all-data`** (JWT) → hydrates **`DataContext`**.

### 6.2 Employee / manager login

1. **`POST /api/auth/emp-login`** against **`Employee`** (`active: true`).
2. Role: **`manager`** if `Department.exists({ managerId: emp._id })`, else **`employee`**; JWT **`exp` ~12h**.
3. Token + role stored; **`Portal`** renders (tabs: attendance, HR, notifications).

### 6.3 Check-in / attendance record

1. Employee uses **`Attendance`** UI → **`POST /api/employee/record`** with **`validateBody(attendanceUpsertSchema)`**.
2. **`upsertEmployeeRecord`** (controller) merges into **`Record`** collection: geo fields, status, optional project, may compute late/OT-related side effects per server logic and **WorkPolicy** / shifts.
3. Related: **`POST /api/attendance/break-start`**, **`break-end`**; admin **`POST /api/attendance/close-day`** runs batch close logic.

### 6.4 Leave request

1. Self-service: **`POST /api/hr/me/leave-request`** (multipart optional) → **`LeaveRequest`** document; may notify (email stub) and admin notifications.
2. Approval: managers via **`PATCH /api/hr/department/leaves/:id`** or admins via **`PATCH /api/admin/leave-requests/:id`** (per `admin.js` implementation).

### 6.5 Early checkout & overtime

1. **Early checkout:** **`POST /api/checkouts/early`** → **`EarlyCheckout`** linked to **`Record`**; approval **`PUT /api/checkouts/early/:id/approve`** (admin/manager).
2. **Overtime:** **`POST /api/overtime`** → **`Overtime`**; action **`PUT /api/overtime/:id/action`** (admin/manager).

### 6.6 Reports & exports (admin UI)

1. **`GET /api/attendance/report`** (admin/manager) supplies aggregation for **Reports** page.
2. Client generates **PDF/XLSX** via **jspdf** / **xlsx** — no separate export API.

---

## 7. Supplementary Notes

- **JWT payload** is minimal (`id`, `role`); fine-grained rules (e.g. department manager) use **Department** lookups on the server.
- **Duplicate record models:** `Record` and `AttendanceRecord` both target attendance rows; **`AttendanceRecord`** enforces unique index and explicit collection name.
- **Static hosting:** Production can serve **`frontend/dist`** from the same Express process as the API (see `app.js`).

---

*Generated from repository static analysis; behavior should be verified against running services and environment configuration.*
