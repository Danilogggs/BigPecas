# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BigPeças** is a car parts e-commerce/catalog application (Portuguese: "Big Parts") with a microservices backend and multiple React frontends.

## Architecture

### Monorepo Structure (no workspace tooling — each package is independent)

```
backend/
  microservice-authWithFirebase/  # Firebase auth service (Express, port 3001)
  microservice-DBpecas/           # Parts catalog service (Express + MySQL, port 3002)
  user-service/                   # User CRUD service (Express + MySQL, bcryptjs)
frontend/
  Tela-inicial/                   # Landing/home page (React + Tailwind, JSX)
  telaTesteAuthFirebase/          # Main app (React + Firebase Auth + React Router)
example_design/                   # UI prototype (React + TypeScript + Tailwind, not production)
```

### Data Flow

- The main frontend (`telaTesteAuthFirebase`) authenticates users via Firebase SDK, then calls `microservice-authWithFirebase` (port 3001) for backend-verified auth and `microservice-DBpecas` / `user-service` (port 3002) for data.
- `microservice-DBpecas` auto-seeds default categories (Motor, Lataria, Elétrica, etc.) and materials on startup.
- `user-service` uses a repository pattern: routes → service → repository → MySQL.

### Frontend Routing (`telaTesteAuthFirebase`)

Protected routes use a `PrivateRoute` component backed by `AuthContext`. Routes include Login, Register, Forgot Password, Dashboard, User Registration, and Parts Registration.

## Development Commands

Each package must be run independently from its own directory.

### Backend services

```bash
# Parts catalog (MySQL required)
cd backend/microservice-DBpecas && npm run dev

# Auth service (Firebase credentials required)
cd backend/microservice-authWithFirebase && npm run dev

# User service (MySQL required, uses nodemon)
cd backend/user-service && npm run dev
```

### Frontend apps

```bash
# Main app (requires backend services running)
cd frontend/telaTesteAuthFirebase && npm run dev   # http://localhost:5173

# Landing page
cd frontend/Tela-inicial && npm run dev

# Lint (Tela-inicial and example_design only)
cd frontend/Tela-inicial && npm run lint
cd example_design && npm run lint
```

### Build

```bash
cd frontend/telaTesteAuthFirebase && npm run build
cd frontend/Tela-inicial && npm run build
cd example_design && npm run build   # TypeScript check + Vite build
```

## Environment Setup

Each service needs its own `.env` file (not committed):

**`backend/microservice-authWithFirebase/.env`**
```
PORT=3001
FRONTEND_URL=http://localhost:5173
FIREBASE_PROJECT_ID=bigpecas
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=<private-key>
```

**`frontend/telaTesteAuthFirebase/.env`**
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=bigpecas.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bigpecas
VITE_FIREBASE_STORAGE_BUCKET=bigpecas.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_URL=http://localhost:3001
VITE_USER_SERVICE_URL=http://localhost:3002
```

**`backend/microservice-DBpecas/.env`** and **`backend/user-service/.env`**
```
PORT=3002
DB_HOST=localhost
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

## Key Notes

- No test suite exists in any package.
- The `example_design/` directory is a standalone prototype and is not imported by any other package.
- `microservice-DBpecas` and `user-service` both default to port 3002 — only one can run at a time unless ports are changed via `.env`.
- The main frontend uses plain JavaScript/JSX; only `example_design` uses TypeScript.
- MySQL schema for `user-service` is in `backend/user-service/sql/init.sql`.
