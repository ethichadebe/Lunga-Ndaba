# Lunga Ndaba

Portfolio for Lunga Ndaba, photographer and videographer: a site framed as a
desktop (menu bar, dock, windows), with the photographs always first.

- `frontend/` — Preact + Vite, served by nginx (which also proxies `/api` and `/media`).
- `backend/` — Node 22, Express, Prisma/Postgres, `sharp` for image sizes. Port 3003.
- `docs/plan.md` — the design: data model, image pipeline, admin, icons.
- `docs/server.md` — server setup, and where his photographs live.

## Run it locally

```bash
docker compose up --build          # site on http://127.0.0.1:8080, admin at /admin (password: change-me)
```

Or without Docker for the frontend:

```bash
cd backend && npm ci && DATABASE_URL=... REQUIRE_MOUNTED_UPLOADS=false UPLOADS_DIR=../uploads npm run dev
cd frontend && npm ci && npm run dev
```

## Checks

```bash
cd backend && npm run lint && npm test
cd frontend && npm run build
```

`npm test` runs the integration tests too when `DATABASE_URL` points at a
throwaway Postgres (they empty its tables first):

```bash
docker run -d --name ln-testdb -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=ln -p 127.0.0.1:55432:5432 postgres:16-alpine
export DATABASE_URL=postgresql://postgres:pw@127.0.0.1:55432/ln
(cd backend && npx prisma migrate deploy && npm test)
```
