# Lunga Ndaba — portfolio

## Mobile Delivery

This repository ships through Mobile Delivery: someone describes a change from their phone, you open a pull request, they merge, and it deploys itself. Follow this for **every** change, whether or not the request mentions it.

**Always:**

- Work on a branch and **open a pull request**. Never push to `main`, and never merge your own work — merging is the human's decision.
- **Run the checks before opening the PR**, so CI is not the first to find a problem.
  - Backend: `cd backend && npm ci && npm run lint && npm test` (set `DATABASE_URL` to a throwaway Postgres to also run the integration tests; see README)
  - Frontend: `cd frontend && npm ci && npm run build`
- **Add a change note** to `docs/journal/` in the same pull request: a dated file saying what changed, whether it worked first time, whether a laptop was needed, and anything that got in the way. See `docs/journal/README.md`.
- Keep the pull request description short and plain: what changed, and why.

**Never:**

- Put server addresses, IP addresses, keys or secrets in this repo.
- Edit anything in `.github/workflows/` unless the request is explicitly about the pipeline.
- Add a dependency without saying in the PR description why it is needed.

## Rules specific to this app

- **Migrations are additive only.** Add tables and nullable columns. Never drop, rename, retype, or add `NOT NULL` to an existing column — the deploy refuses it, and `backend/test/unit.test.js` checks it first.
- **His photographs live on `/opt/lunga-ndaba/uploads`** (mounted at `/data/uploads`). Never write uploads anywhere else, never serve `originals/`, never hard-delete an original (removals go to `trash/`).
- **The work comes first.** If window chrome makes a photo smaller or slower, the chrome loses.
- **Invent nothing about Lunga.** No made-up projects, clients or bio. Missing content gets an obvious placeholder.
- Icons are drawn in `frontend/src/icons.jsx` by the rules at the top of that file. No system or brand artwork.
