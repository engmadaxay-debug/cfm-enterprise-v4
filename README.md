# Cimraan Finance Manager (CFM) Enterprise v3.1 - Phase 5

CFM is a simple finance and exchange management app for Cimraan Exchange.

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT

## Phase 5 Added
- Calendar module
- Staff Isolation
- Notifications
- User Dashboard
- Admin Dashboard
- Security/Login History/Sessions
- Session tracking
- Updated database schema

## Start Backend
```bash
cd backend
cp .env.example .env
npm install
npm run db:init
npm run seed
npm run dev
```

## Start Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Default Login
Check `backend/src/config/seed.js` for the default admin email/password.

## Important
Run `npm run db:init` after updating from Phase 4 so the new Phase 5 tables are created.

## Main New URLs
- `/calendar`
- `/notifications`
- `/staff-isolation`
- `/my-dashboard`
- `/admin-dashboard`
- `/security`

## CFM Enterprise v3.2 - Phase 6

Phase 6 adds production/security/cloud readiness:

- Security middleware: rate limit, Helmet, CORS hardening, request IDs, body sanitizing.
- API docs: `/api/phase6/swagger.json`.
- Production health: `/api/phase6/health/production`.
- Migrations: `cd backend && npm run migrate`.
- Backups: `cd backend && npm run backup` and `/api/phase6/backup/run`.
- Logs: `backend/logs/*.log` at runtime.
- Docker: `docker compose -f docker-compose.prod.yml up --build`.
- CI/CD: `.github/workflows/ci.yml`.
- Cloud configs: `render.yaml`, `railway.json`.
- PWA: installable frontend with `manifest.webmanifest` and service worker.
- Frontend management page: `/phase6` or `/production`.
