# Application Architecture & Standards

## 1. Tech Stack
* **Frontend:** React + Vite. **Strictly TypeScript (`.ts`, `.tsx`).**
* **Backend:** Node.js + Express. **JavaScript (`.js`).**
* **Database:** MongoDB via Mongoose.
* **Authentication:** JWT (JSON Web Tokens).

## 2. Frontend Styling & UI Architecture
* **CSS Framework:** Tailwind CSS (utility-first).
* **UI Primitives:** Radix UI.
* **Styling Utilities:** `clsx`, `tailwind-merge`, and `class-variance-authority` (CVA) must be used for constructing dynamic component classes.

## 3. State Management (Frontend)
* **Strict Rule:** NO Redux, NO Zustand, NO React Query.
* State is managed globally via **React Context**.
* Approved Contexts: `AuthContext`, `DataContext`, `AdminNavContext`, `LangContext`, `ThemeContext`.
* Feature-specific state should be kept local to the feature components or managed via custom hooks within the feature directory.

## 4. Directory Structure (Feature-Based)
The application strictly follows a feature-based architecture. Do not dump files into massive shared `/components` or `/pages` folders. 

### Frontend Expected Structure (`/frontend/src/`):
/src
  /assets
  /components      # ONLY generic, globally shared UI components (Button, Input, Modal, Table). No business logic.
  /stores          # Global state contexts (AuthContext, DataContext, etc.)
  /lib             # Shared formatters, generic export utilities, etc.
  /features        # Domain-specific logic, UI, types, and API wrappers
    /attendance    # Clock-ins, records, overtime, shift UI
    /auth          # Login pages and auth gating
    /communication # Announcements and notifications
    /core          # Layout shells, navigation (Sidebar, Topbar), and brand logos
    /hr            # Leave requests, profile updates, accruals, onboarding
    /organization  # Employees, departments, groups, directory org chart
    /projects      # Project sites, geofences, map UI
    /reporting     # Admin dashboards, analytics, audit logs, specific report exports
    /safety        # Incident reporting forms and admin panels
    /system        # System settings

### Backend Expected Structure (`/backend/`):
/backend
  /config          # DB connection, environment variables
  /controllers     # Request handlers, grouped by feature
  /models          # Mongoose schemas
  /routes          # Express route definitions
  /middleware      # JWT verification, error handling, role-checking
  /utils           # Helper functions