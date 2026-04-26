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
The application strictly follows a feature-based architecture. Do not dump files into massive shared `/components` or `/pages` folders unless they are truly global primitives (like a generic Button).

### Frontend Expected Structure (`/frontend/src/`):
/src
  /assets
  /components      # ONLY generic, globally shared UI components (Button, Input, Modal) utilizing Radix/Tailwind.
  /contexts        # Global state (AuthContext, ThemeContext, etc.)
  /features        # Domain-specific logic and UI
    /attendance    # Contains its own components, hooks, and api calls
    /leave
    /safety
    /projects
    /hr-profile
  /hooks           # Globally shared custom hooks (e.g., useDebounce)
  /lib             # Utility configurations (axios instance, tailwind-merge helpers)
  /utils           # Shared helper functions (date formatting, etc.)
  /types           # Global TypeScript interfaces and types

### Backend Expected Structure (`/backend/`):
/backend
  /config          # DB connection, environment variables
  /controllers     # Request handlers, grouped by feature
  /models          # Mongoose schemas
  /routes          # Express route definitions
  /middleware      # JWT verification, error handling, role-checking
  /utils           # Helper functions