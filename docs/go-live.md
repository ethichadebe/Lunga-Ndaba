# Going live: step by step

Everything a person has to do to get Lunga's site live, in order. Each step
says where you do it, what to type, and how to know it worked. The steps that
need a terminal on the server are marked **(server)**. An SSH app on a phone
works for those. Nothing here needs a laptop unless you want one.

I rehearsed the steps marked ✓ against the real deploy script, on an empty
folder, before writing them down.

Wherever you see `SERVER`, use your server's address. Don't paste it into this
repo.

---

## 0. Have these ready

| What | Where it comes from |
|---|---|
| Root SSH access to the server | You already use it for the other apps |
| The domain for the site | Lunga, or whoever registers it |
| The four deploy secrets (step 5) | The same values your other Mobile Delivery repos use |
| A password for Lunga's admin | Make one up; he signs in with it |

---

## 1. Teach the deploy about this app (workflows repo + server)

The deploy script refuses any app it doesn't know, and `lunga-ndaba` isn't in
it yet.

**1a. In `ethichadebe/workflows`,** add this block to `server/md-deploy-root`
next to the other apps (for example after `atapp`), then merge it:

```bash
  lunga-ndaba)
    # Lunga Ndaba's portfolio: frontend, backend, and a database deploys never touch.
    # His photographs live in /opt/lunga-ndaba/uploads, mounted into the backend.
    APP_KIND=compose
    APP_DIR=/opt/lunga-ndaba
    COMPOSE_FILE=docker-compose.prod.yml
    REGISTRY_PREFIX=ghcr.io/ethichadebe/lunga-ndaba
    LIVE_NETWORK=lunga-ndaba_default
    BACKEND_PORT=3003
    BACKEND_HEALTH_PATHS="/health /work"
    CANDIDATE_BACKEND_PORT=13004
    CANDIDATE_FRONTEND_PORT=18085
    MIGRATION_STYLE=prisma
    ;;
```

**1b. (server)** Install the updated script. Nothing installs it automatically,
on purpose. From a machine with the workflows repo checked out:

```bash
scp server/md-deploy server/md-deploy-root root@SERVER:/tmp/
ssh root@SERVER 'install -o root -g root -m 0755 /tmp/md-deploy      /usr/local/bin/md-deploy
                 install -o root -g root -m 0755 /tmp/md-deploy-root /usr/local/sbin/md-deploy-root'
```

**Check:** `ssh root@SERVER '/usr/local/sbin/md-deploy-root status lunga-ndaba'`
prints `app=lunga-ndaba kind=compose`. It used to print `refused: unknown app`.
The site lines will show `000` until step 6; that's expected.

---

## 2. Point the domain at the server

At the domain registrar, add an `A` record for the domain (and for `www` if
wanted) pointing to the server's IP address.

**Check:** `ping the-domain` answers from the server's address. DNS can take
a few minutes to an hour.

---

## 3. Make the app's folder on the server ✓ (server)

```bash
sudo mkdir -p /opt/lunga-ndaba/uploads
cd /opt/lunga-ndaba
sudo curl -fsSLo docker-compose.prod.yml \
  https://raw.githubusercontent.com/ethichadebe/Lunga-Ndaba/main/docker-compose.prod.yml
```

(Before the PR is merged, use `claude/quirky-turing-8osp9h` in place of `main`.)

**Pick a free port** for the site on the server's localhost. List what's taken:

```bash
sudo ss -ltn | grep 127.0.0.1
```

Choose one not in that list. Don't use 13004 or 18085, which are reserved
for the deploy's checks. The examples below use 8093.

**Write `/opt/lunga-ndaba/.env`:**

```bash
PW=$(openssl rand -hex 16)
sudo tee /opt/lunga-ndaba/.env >/dev/null <<EOF
BACKEND_IMAGE=
FRONTEND_IMAGE=
FRONTEND_PORT=127.0.0.1:8093
POSTGRES_DB=lunga
POSTGRES_USER=lunga
POSTGRES_PASSWORD=$PW
DATABASE_URL=postgresql://lunga:$PW@db:5432/lunga
ADMIN_PASSWORD=choose-lungas-password
SESSION_SECRET=$(openssl rand -hex 32)
EOF
sudo chmod 600 /opt/lunga-ndaba/.env
sudo nano /opt/lunga-ndaba/.env      # set ADMIN_PASSWORD to the real one
```

Leave the two `_IMAGE` lines empty: the deploy fills them in.

**Start the database once.** The first deploy checks the new version against
the live database, so the database has to exist first. Compose won't run while
the image names are empty, so give it stand-in names for this one command:

```bash
cd /opt/lunga-ndaba
sudo BACKEND_IMAGE=not-deployed-yet FRONTEND_IMAGE=not-deployed-yet \
  docker compose -f docker-compose.prod.yml up -d db
```

**Check:** `docker ps` shows `lunga-ndaba-db-1` as `healthy` after a few
seconds, and `docker network ls` shows `lunga-ndaba_default`.

---

## 4. Put the site on the internet with HTTPS (server)

Add an nginx site on the host, with your domain and the port from step 3:

```nginx
# /etc/nginx/sites-available/lunga-ndaba  (or conf.d/lunga-ndaba.conf)
server {
    listen 80;
    server_name the-domain www.the-domain;

    client_max_body_size 210m;          # his originals can be large
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:8093;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lunga-ndaba /etc/nginx/sites-enabled/   # if you use sites-*
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d the-domain -d www.the-domain
```

**Check:** `https://the-domain` answers. A `502` is right for now: nothing is
deployed yet.

---

## 5. Give the repo its deploy secrets (GitHub, works on a phone browser)

Go to **github.com/ethichadebe/Lunga-Ndaba → Settings → Secrets and
variables → Actions → New repository secret**. Add:

| Secret | Value |
|---|---|
| `VPS_DEPLOY_KEY` | The deploy **private** key: the same one the other Mobile Delivery repos use (the private half of `md_deploy`, whose `.pub` is on the server) |
| `VPS_HOST` | The server's address |
| `TELEGRAM_BOT_TOKEN` | Your deploy bot's token (BotFather → /mybots if you don't have it saved) |
| `TELEGRAM_CHAT_ID` | The chat the bot posts to |
| `ANTHROPIC_API_KEY` | Optional: adds a one-line comment to each deploy message |

GitHub never shows a secret again after saving it, so copy the values from
wherever you keep them. You can't read them back from another repo.

---

## 6. Merge and deploy ✓

1. Merge [ethichadebe/Lunga-Ndaba#1](https://github.com/ethichadebe/Lunga-Ndaba/pull/1).
   The **Deploy** workflow starts by itself.
2. **The first run will most likely fail when the server pulls the images.**
   New packages on GitHub's registry start private. Telegram will say the
   deploy failed and the live site is untouched; that's this. Fix it once:
   - Go to **github.com/ethichadebe?tab=packages**. Open
     `lunga-ndaba/backend` → **Package settings** → **Change visibility** →
     **Public**. Do the same for `lunga-ndaba/frontend`. (The repo is public,
     so the images may be too. They contain no secrets: those all live in
     `.env` on the server.)
   - **Actions → Deploy → Run workflow** to try again.
3. A good run's log ends with `migration 20261026000000_init is additive`,
   `candidate backend healthy`, `candidate site healthy`,
   `cutover done, site live`, and Telegram says so.

**Check:**

```bash
curl -s https://the-domain/api/health
# {"ok":true,"uploads":"mounted"}      ← "mounted" is the important word
```

If it says `"not-mounted"`, uploads are switched off on purpose. The backend
isn't seeing `/opt/lunga-ndaba/uploads`. Check the folder exists and that the
server's `docker-compose.prod.yml` is the one from this repo.

---

## 7. Hand it to Lunga

Send him:

- **The admin:** `https://the-domain/admin`, and the password from step 3.
- **Adding it to his phone:** open the admin in his browser, then use
  "Add to Home Screen" (iPhone: Share → Add to Home Screen; Android:
  ⋮ → Add to Home screen). It opens like an app after that.

What he does first:

1. **About me:** name, one-line intro, bio, enquiries email, Instagram name,
   where he's based. Anything left blank shows "not added yet" on the site.
2. **Your work → New project:** one per shoot. **Add photos** opens his
   camera roll. He can pick many at once and leave the screen open while they
   upload. "Preparing…" means the site is making the web sizes, about 10–20
   seconds per photo.
3. Tap a photo to make it the **cover**, reorder it, or add a caption.
4. **Add a film:** paste a YouTube or Vimeo link.
5. Flip **Live** on when the project is ready. Nothing is public before that.
6. **Notes:** new notes wait in this tab until he approves them.

He doesn't need to resize or export anything. The site keeps the file he sends
exactly as it is, and he can download it back from the photo's screen.

---

## 8. Back up his work (server, once)

The originals are the one thing that can't be made again. The web sizes can.

```bash
sudo mkdir -p /var/backups/lunga-ndaba
sudo tee /etc/cron.d/lunga-ndaba-backup >/dev/null <<'EOF'
# Nightly: the database, and a copy of the originals. Keeps 14 days of dumps.
15 3 * * * root docker exec lunga-ndaba-db-1 pg_dump -U lunga lunga | gzip > /var/backups/lunga-ndaba/db-$(date +\%F).sql.gz && find /var/backups/lunga-ndaba -name 'db-*.sql.gz' -mtime +14 -delete
EOF
```

(`docker exec` is used on purpose: `docker compose` commands on this folder
need the image names, and cron doesn't have them.)

Then copy `/opt/lunga-ndaba/uploads/originals` and `/var/backups/lunga-ndaba`
**off the server** on a schedule: `rclone` to cloud storage, or `rsync` to
another machine. A backup on the same disk doesn't survive the disk.

---

## 9. Put the repo on the audit list

In `ethichadebe/workflows` → **Settings → Secrets → Actions**, add
`ethichadebe/Lunga-Ndaba` to the `ONBOARDED_REPOS` secret.

---

## After this, every change is hands-off

Ask for a change from your phone, a PR appears, you merge it, and it deploys.
The deploy checks the new version beside the live one, and only switches if it
answers. His photographs and the database are never touched by a deploy.

Two things are **not** automatic, by design:

- **`docker-compose.prod.yml` on the server.** If a PR changes it, copy it up
  again (step 3's `curl`), then run
  `sudo docker compose -f docker-compose.prod.yml up -d` in `/opt/lunga-ndaba`.
  If the database's settings changed, it restarts for a few seconds; its data
  stays in its volume.
- **The deploy script** in the workflows repo (step 1b).

## When something goes wrong

| You see | It means | Do |
|---|---|---|
| `refused: unknown app 'lunga-ndaba'` | Step 1 isn't done, or the script wasn't installed on the server | Steps 1a and 1b |
| Deploy fails at "pulled both candidate images" or earlier | Images are private | Step 6.2 |
| `could not determine the migration state` | The database isn't running, or `DATABASE_URL` is wrong | Step 3's database start, and check `.env` |
| `REFUSED: migration … changes existing data` | A PR tried a destructive migration | Nothing broke. Ask for an additive version of the change |
| Admin says "Uploads are switched off" | The uploads folder isn't mounted | Step 6's check |
| Admin says "Sign-in is not set up on the server yet" | `ADMIN_PASSWORD` is empty | Set it in `.env`, then `cd /opt/lunga-ndaba && sudo docker compose -f docker-compose.prod.yml up -d --force-recreate backend` (a plain `docker restart` keeps the old values) |
| Sign-ins stop surviving a restart | `SESSION_SECRET` is empty | Set it in `.env`, then recreate the backend as above |
