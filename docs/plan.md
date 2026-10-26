# Plan: Lunga Ndaba's portfolio

A portfolio for a photographer and videographer, framed as a desktop: a menu
bar, a dock, windows. The frame is ours, drawn from the concept and not from
anyone's page. One rule outranks the styling: **the frame never gets between a
visitor and a photograph.** Where the two disagree, the chrome gets out of the way.

## Shape

| Part | What it is |
|---|---|
| `frontend/` | Preact + Vite single-page site, served by nginx. nginx also proxies `/api/*` (prefix stripped) and `/media/*` to the backend. |
| `backend/` | Node 22 + Express on **port 3003**. Prisma on Postgres. `sharp` makes the web sizes. |
| `db` | `postgres:16-alpine`, its data in a named volume. Never swapped by a deploy. |
| Uploads | Host folder `/opt/lunga-ndaba/uploads`, bind-mounted into the backend at `/data/uploads`. |

Deploy: `docker-compose.prod.yml` takes `image: ${BACKEND_IMAGE}` and
`image: ${FRONTEND_IMAGE}`. The candidate is checked on `/health` and `/work`.

## Data model

All tables are new, so the first migration is additive by construction. Later
changes follow the same rule: add tables and nullable columns. Never drop,
rename, retype, or add `NOT NULL` to a column that already exists.

- **Project**: a shoot or a body of work. `slug` (unique, used in the URL),
  `title`, `summary?`, `dateLabel?` (free text such as "March 2025", because
  photographers date work loosely), `location?`, `coverPhotoId?`, `position`
  (his order), `published` (default off, so he can build a project before anyone
  sees it).
- **Photo**: one uploaded image in a project. It holds the original's facts:
  `originalName`, `originalPath` (relative to the uploads folder), `mimeType`,
  `bytes`, `width`, `height` (after EXIF rotation). It holds the processing
  state: `status` = `processing | ready | failed`, `error?`, `widths Int[]`
  (sizes actually generated), `version` (a random tag in the file names, so
  URLs can be cached forever). It holds the placeholder: `color` (dominant
  colour) and `blur` (a ~300-byte WebP data URI). It holds his words: `alt?`
  and `caption?`. And it has a `position`.
- **Video**: a film in a project. It has `provider` = `youtube | vimeo`,
  `providerId`, `title?`, `caption?`, `shape` = `landscape | vertical | square`,
  `thumbnailUrl?` (looked up once when saved), and `position`. Nothing is stored
  on our disk.
- **Note**: the note box. It has `name`, `message`, `relation?` ("how you know
  Lunga"), `status` = `pending | approved`, `ipHash` (salted hash; no raw IPs
  are kept), `createdAt`, and `approvedAt?`.
- **Profile**: one row, all optional. It has `displayName`, `intro`, `bio`,
  `email`, `instagram`, and `location`. Any blank field shows a plain
  "not added yet" placeholder on the site.

## How images are processed

1. **Upload.** The admin sends one file per request, one after another, with a
   progress bar per file. One stalled file on mobile data then costs one file,
   not the batch. Limit: 200 MB per file. Accepted types: JPEG, PNG, WebP, TIFF.
   The file picker does not offer HEIC, so an iPhone converts to JPEG on the way
   out. RAW is out of scope.
2. **Keep the original.** The bytes are streamed to
   `uploads/originals/<photoId>/<original-name>` untouched. The original is
   never served publicly. The admin has a "Download original" button.
3. **Process in the background.** A single in-process worker handles one photo
   at a time, so a small VPS stays responsive. The upload returns at once with
   the status `processing`. On start-up, any photo still marked `processing` is
   queued again.
4. **Make the web sizes.** The worker auto-rotates from EXIF, converts to sRGB,
   and strips all metadata from the copies. That includes GPS: the original
   keeps it, the public files don't. Widths are **400, 800, 1200, 1600, 2400**,
   never larger than the original. Each width is made as **AVIF**, **WebP** and
   **JPEG**. They are written to `uploads/derived/<photoId>/<version>-<w>.<ext>`.
5. **Make the placeholder.** The dominant colour, plus a 16 px wide blurred
   WebP stored inline in the database. Width and height are known, so the
   browser reserves the exact space before any byte of the image arrives.
6. **Serve.** `/media/...` is served from the derived folder only, with
   `Cache-Control: public, max-age=31536000, immutable`.
7. **Render.** A `<picture>` lists AVIF, then WebP, then a JPEG `<img>` with
   `srcset`, real `sizes`, `width`/`height`, and `decoding="async"`. The first
   few images load eagerly, with `fetchpriority="high"` on the first. Everything
   below the fold has `loading="lazy"`. The placeholder colour and blur sit
   under the image until it fades in.
8. **Delete.** Removing a photo moves its original to `uploads/trash/`. The
   app never hard-deletes one of his originals.

## Video

No video is stored or served by us. He pastes a YouTube or Vimeo link. The site
shows a poster with our own play button, and only loads the player
(`youtube-nocookie.com`, or Vimeo with `dnt=1`) when someone presses play. A
page with six films then costs six thumbnails, not six players. The frame is
styled into the window: rounded, matching the chrome, and the right shape for
landscape, vertical or square.

## The desktop (public site)

- **Menu bar** (top, slim): the "LN" mark, his name, then Work · Films · Notes ·
  About · Contact, and a clock on the right.
- **Dock** (bottom): Work, Films, Notes, About, Contact, and Instagram (an
  outbound link, drawn with our own generic glyph, not Instagram's logo). It
  appears only once his handle is set.
- **Windows**: one per app or per project. On a wide screen they can be dragged,
  focused and maximised, and each has a URL (`/work/<slug>`, `/notes`, ...) so
  links can be shared. On a phone a window is a full-screen sheet with a single
  close button.
- **Opening state**: `/` opens the **Work** window straight away, filled with
  project covers, so the first thing anyone sees is photographs. That holds on a
  phone too.
- **Project window**: title, his words, then the photos laid out in justified
  rows. No cropping, and every image keeps its own ratio. On a phone it is one
  column, full width. Films follow the photos.
- **Viewer**: tapping a photo opens a full-screen, black viewer. It has no
  window chrome: a close button and a counter that fade away, with
  swipe/arrows/Esc. This is where the frame steps aside completely.

## Icon set direction

Drawn by us, as inline SVG in one file (`frontend/src/icons.jsx`). There is no
icon font and no system artwork.

- **Theme: the darkroom / light table.** The desktop is a pale, warm light
  table. Icons are drawn like marks on a contact sheet.
- **Grid**: 48 x 48 tile, drawn on a 24-unit grid. **Stroke**: 1.75 units,
  round caps and joins, ink colour. **One accent**: a safelight amber, used for
  one detail per icon and nothing else. Tiles are rounded squares in
  paper-white with an ink outline. The shapes are our own and are not Apple's
  squircles.
- **Set**: Work (a negative sleeve with perforations), Films (a clapper),
  Notes (a pinned card), About (an ID card), Contact (an envelope), Instagram
  (a plain camera body with an outbound arrow), and the project folder (a
  sleeve that shows the cover photo inside). The UI glyphs are close, maximise,
  back, upload, trash, download, eye, star, arrows, and play.

## Admin (`/admin`, built for his phone)

Plain screens, big buttons, no markdown, no JSON, no developer words.

1. **Sign in**: a single password field. The password is set once on the server
   (`ADMIN_PASSWORD`). Sign-in attempts are rate-limited. The session is an
   HttpOnly, SameSite=Strict cookie that lasts 30 days.
2. **Work**: his projects as cards (cover, title, photo count, Live/Hidden). He
   can add a project and move projects up or down.
3. **Project**:
   - Fields: title, a few words, when, where, and a Live switch.
   - **Add photos**: opens the camera roll with multi-select, then shows
     per-file progress and "Preparing..." until ready.
   - Tap a photo for: set as cover, description (alt) and caption, move earlier
     or later, download original, remove.
   - **Add a film**: paste a link, add an optional title, choose a shape.
   - Delete the project (it asks first, and the originals go to trash).
4. **Notes**: Waiting / Showing tabs. Each note has Approve, Hide and Delete.
5. **About me**: name, intro, bio, email, Instagram, location.

## Note box: abuse controls

- Nothing is public until he approves it.
- **Rate limit**, counted in the database so a restart does not reset it: 3
  notes per IP per hour and 6 per day. Above 300 waiting notes, the box closes
  to everyone until he clears some.
- A honeypot field, a minimum time between opening the form and sending, and
  length limits (name 80, relation 80, message 1000 characters). Links in the
  message are refused.
- Approve, hide and **delete** in the admin.

## Hard constraints and how they are met

| Constraint | Met by |
|---|---|
| Backend on 3003 | `PORT=3003` in the image. Ports 13004/18085 are never mentioned. |
| `/health` + `/work` = 200 | `/health` runs `SELECT 1`. `/work` lists published projects from Postgres. |
| Additive migrations | One `init` migration that creates tables only. It is checked against the dispatcher's own regex in a test. |
| `image:` not `build:` | `docker-compose.prod.yml`. `db` uses a fixed upstream image. |
| Uploads survive | Bind mount `/opt/lunga-ndaba/uploads:/data/uploads`. On start the backend checks that the folder is a mount: it must sit on a different device from the container's own disk. Otherwise **uploads are refused** with a clear message. `/health` still answers so the candidate check works, and it reports `uploads: "not-mounted"`. A missing mount fails loudly, never silently. |
| No addresses or keys | Everything comes from the server's `.env`. `.env.example` lists names only. |

## What is needed from Lunga

- His photographs (originals), grouped however he thinks of his work.
- Film links (YouTube or Vimeo).
- A bio, a short intro line, a contact email, his Instagram handle, and his
  location (if he wants it shown).
- The domain the site will live on.
