# Running it on the server

The deploy itself is automatic (see `.github/workflows/deploy.yml` and
`docs/compose-destination.md` in `ethichadebe/workflows`). This page is about
what lives where on the box.

## Setting it up

Follow [`go-live.md`](go-live.md). It covers the deploy script's entry for this app, the
server folder and `.env`, starting the database before the first deploy, nginx
and HTTPS, the repo's secrets, making the images public, and backups.

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

**Back up** `uploads/originals` and a `pg_dump` of the database (go-live
step 8). The originals are the irreplaceable part.
