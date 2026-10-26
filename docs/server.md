# Running it on the server

The deploy itself is automatic (see `.github/workflows/deploy.yml` and
`docs/compose-destination.md` in `ethichadebe/workflows`). These are the
one-time steps on the box, plus what to know about his files.

## One-time setup

```bash
sudo mkdir -p /opt/lunga-ndaba/uploads
# copy docker-compose.prod.yml from this repo, and .env.example as .env
sudo cp docker-compose.prod.yml /opt/lunga-ndaba/
sudo cp .env.example /opt/lunga-ndaba/.env   # then fill it in
```

In `.env`: `POSTGRES_PASSWORD`, a matching `DATABASE_URL` (host `db`),
`ADMIN_PASSWORD` (what Lunga signs in with), `SESSION_SECRET`
(`openssl rand -hex 32`), and `FRONTEND_PORT` as `127.0.0.1:<port>`. The port
must not be 13004 or 18085: those are the deploy's candidate ports.

The host's nginx (TLS) proxies the domain to `FRONTEND_PORT`. Let it pass
`X-Forwarded-For` and `X-Forwarded-Proto`, and allow large bodies for
uploads (`client_max_body_size 210m;`).

## The dispatcher block

`server/md-deploy-root` in `ethichadebe/workflows` needs this app's block.
These values match this repo:

```bash
  lunga-ndaba)
    APP_KIND=compose
    APP_DIR=/opt/lunga-ndaba
    COMPOSE_FILE=docker-compose.prod.yml
    REGISTRY_PREFIX=ghcr.io/ethichadebe/lunga-ndaba
    LIVE_NETWORK=lunga-ndaba_default          # compose project is pinned to "lunga-ndaba"
    BACKEND_PORT=3003
    BACKEND_HEALTH_PATHS="/health /work"
    CANDIDATE_BACKEND_PORT=13004
    CANDIDATE_FRONTEND_PORT=18085
    MIGRATION_STYLE=prisma
    ;;
```

## Where his photographs are

| Path on the host | What |
|---|---|
| `/opt/lunga-ndaba/uploads/originals/<photo id>/<file name>` | **His originals, byte for byte as uploaded.** Never served to the public. |
| `/opt/lunga-ndaba/uploads/derived/<photo id>/` | Web sizes (AVIF/WebP/JPEG). Can be regenerated from the originals. |
| `/opt/lunga-ndaba/uploads/trash/` | Originals of removed photos. The app never deletes these. |
| Docker volume `lunga-ndaba_pgdata` | The database (projects, order, captions, notes). |

The folder is bind-mounted into the backend at `/data/uploads`. The backend
checks at start-up that this folder is a mount from outside the container; if
it isn't, it **refuses every upload** and `/health` reports
`"uploads":"not-mounted"`. A missing mount can't silently eat photographs.

The entrypoint makes the folder belong to the container's `node` user
(uid 1000) before dropping root.

**Back up** `uploads/originals` and a `pg_dump` of the database. The
originals are the irreplaceable part.
