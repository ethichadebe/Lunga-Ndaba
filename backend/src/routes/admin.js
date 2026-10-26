import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { h, HttpError, text, slugify } from '../util.js';
import { adminPhoto, publicVideo, coverOf } from '../serialize.js';
import { inspectUpload } from '../media.js';
import { safeFileName, moveToTrash } from '../storage.js';
import { parseVideoUrl, lookupThumbnail } from '../video.js';
import {
  passwordMatches,
  setSession,
  clearSession,
  isSignedIn,
  requireAdmin,
  attemptLimiter,
} from '../auth.js';

const byPosition = [{ position: 'asc' }, { createdAt: 'asc' }];
const SHAPES = new Set(['landscape', 'vertical', 'square']);

// Swap an item with its neighbour, then renumber the whole list 0..n so
// positions never collide.
async function move(prisma, model, where, id, direction) {
  const items = await prisma[model].findMany({ where, orderBy: byPosition, select: { id: true } });
  const i = items.findIndex((x) => x.id === id);
  if (i === -1) throw new HttpError(404, 'Not found');
  const j = direction === 'up' ? i - 1 : i + 1;
  if (j >= 0 && j < items.length) [items[i], items[j]] = [items[j], items[i]];
  await prisma.$transaction(items.map((x, n) => prisma[model].update({ where: { id: x.id }, data: { position: n } })));
}

async function nextPosition(prisma, model, where) {
  const last = await prisma[model].findFirst({ where, orderBy: { position: 'desc' }, select: { position: true } });
  return last ? last.position + 1 : 0;
}

async function uniqueSlug(prisma, title, exceptId) {
  const base = slugify(title);
  for (let n = 1; n < 1000; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const clash = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === exceptId) return slug;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export function adminRoutes({ prisma, config, dirs, getStorage, worker }) {
  const r = express.Router();
  const json = express.json({ limit: '64kb' });
  const signIns = attemptLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

  r.post(
    '/login',
    json,
    h(async (req, res) => {
      if (!config.adminPassword) throw new HttpError(503, 'Sign-in is not set up on the server yet.');
      if (!signIns.take(req.ip)) throw new HttpError(429, 'Too many tries. Please wait 15 minutes.');
      if (!passwordMatches(req.body?.password || '', config.adminPassword)) {
        throw new HttpError(401, 'That password is not right.');
      }
      signIns.reset(req.ip);
      setSession(res, req, config.sessionSecret);
      res.json({ ok: true });
    }),
  );

  r.post('/logout', (_req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  r.get('/me', (req, res) => {
    const s = getStorage();
    res.json({ signedIn: isSignedIn(req, config.sessionSecret), uploadsReady: s.ok });
  });

  r.use(requireAdmin(config.sessionSecret));

  // ── Projects ──────────────────────────────────────────────────────────
  r.get(
    '/projects',
    h(async (_req, res) => {
      const projects = await prisma.project.findMany({
        orderBy: byPosition,
        include: { photos: { orderBy: byPosition }, _count: { select: { videos: true } } },
      });
      res.json({
        projects: projects.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          published: p.published,
          cover: coverOf(p),
          photoCount: p.photos.length,
          processing: p.photos.filter((x) => x.status === 'processing').length,
          videoCount: p._count.videos,
        })),
      });
    }),
  );

  r.post(
    '/projects',
    json,
    h(async (req, res) => {
      const title = text(req.body?.title, 120);
      if (!title) throw new HttpError(400, 'Please give the project a name.');
      // New projects go to the top: the newest work is usually what he wants seen.
      await prisma.project.updateMany({ data: { position: { increment: 1 } } });
      const project = await prisma.project.create({
        data: { title, slug: await uniqueSlug(prisma, title), position: 0 },
      });
      res.status(201).json({ id: project.id });
    }),
  );

  async function loadProject(id) {
    const p = await prisma.project.findUnique({
      where: { id },
      include: { photos: { orderBy: byPosition }, videos: { orderBy: byPosition } },
    });
    if (!p) throw new HttpError(404, 'That project no longer exists.');
    return p;
  }

  const projectView = (p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary || '',
    dateLabel: p.dateLabel || '',
    location: p.location || '',
    published: p.published,
    coverPhotoId: p.coverPhotoId,
    photos: p.photos.map(adminPhoto),
    videos: p.videos.map(publicVideo),
  });

  r.get('/projects/:id', h(async (req, res) => res.json(projectView(await loadProject(req.params.id)))));

  r.patch(
    '/projects/:id',
    json,
    h(async (req, res) => {
      const p = await loadProject(req.params.id);
      const b = req.body || {};
      const data = {};
      if ('title' in b) {
        data.title = text(b.title, 120);
        if (!data.title) throw new HttpError(400, 'Please give the project a name.');
        // The address follows the name until the project goes live; after
        // that it stays put, so shared links keep working.
        if (!p.published && data.title !== p.title) data.slug = await uniqueSlug(prisma, data.title, p.id);
      }
      if ('summary' in b) data.summary = text(b.summary, 2000);
      if ('dateLabel' in b) data.dateLabel = text(b.dateLabel, 80);
      if ('location' in b) data.location = text(b.location, 120);
      if ('published' in b) data.published = Boolean(b.published);
      if ('coverPhotoId' in b) {
        if (b.coverPhotoId && !p.photos.some((x) => x.id === b.coverPhotoId)) {
          throw new HttpError(400, 'That photo is not in this project.');
        }
        data.coverPhotoId = b.coverPhotoId || null;
      }
      await prisma.project.update({ where: { id: p.id }, data });
      res.json(projectView(await loadProject(p.id)));
    }),
  );

  r.post(
    '/projects/:id/move',
    json,
    h(async (req, res) => {
      await move(prisma, 'project', {}, req.params.id, req.body?.direction);
      res.json({ ok: true });
    }),
  );

  r.delete(
    '/projects/:id',
    h(async (req, res) => {
      const p = await loadProject(req.params.id);
      for (const photo of p.photos) {
        await moveToTrash(dirs, photo.originalPath).catch(() => {});
        await fs.rm(path.join(dirs.derived, photo.id), { recursive: true, force: true });
      }
      await prisma.project.delete({ where: { id: p.id } });
      res.json({ ok: true });
    }),
  );

  // ── Photos ────────────────────────────────────────────────────────────
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dirs.tmp),
      filename: (_req, _file, cb) => cb(null, `${randomUUID()}.upload`),
    }),
    limits: { fileSize: config.maxUploadBytes, files: 1 },
  });

  // Never write a photo anywhere a deploy would destroy it.
  const uploadsMustBeReady = (_req, _res, next) => {
    const s = getStorage();
    if (!s.ok) {
      return next(
        new HttpError(503, 'Uploads are switched off: the photo folder is not connected to permanent storage. Nothing was saved.'),
      );
    }
    next();
  };

  r.post(
    '/projects/:id/photos',
    uploadsMustBeReady,
    h(async (req, _res, next) => {
      await loadProject(req.params.id);
      next();
    }),
    upload.single('file'),
    h(async (req, res) => {
      const file = req.file;
      if (!file) throw new HttpError(400, 'No photo was received.');
      const check = await inspectUpload(file.path);
      if (!check.ok) {
        await fs.rm(file.path, { force: true });
        throw new HttpError(415, check.reason);
      }
      const id = randomUUID();
      const name = safeFileName(file.originalname);
      const rel = path.posix.join('originals', id, name);
      await fs.mkdir(path.join(dirs.originals, id), { recursive: true });
      // Same disk, so this is a rename: the bytes he sent are kept exactly.
      await fs.rename(file.path, path.join(dirs.root, rel));
      const photo = await prisma.photo.create({
        data: {
          id,
          projectId: req.params.id,
          originalName: String(file.originalname || name).slice(0, 255),
          originalPath: rel,
          mimeType: file.mimetype || `image/${check.format}`,
          bytes: file.size,
          width: check.width,
          height: check.height,
          position: await nextPosition(prisma, 'photo', { projectId: req.params.id }),
        },
      });
      worker.enqueue(photo.id);
      res.status(201).json(adminPhoto(photo));
    }),
  );

  async function loadPhoto(id) {
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new HttpError(404, 'That photo no longer exists.');
    return photo;
  }

  r.get(
    '/photos/:id',
    h(async (req, res) => res.json(adminPhoto(await loadPhoto(req.params.id)))),
  );

  r.patch(
    '/photos/:id',
    json,
    h(async (req, res) => {
      const photo = await loadPhoto(req.params.id);
      const data = {};
      if ('alt' in req.body) data.alt = text(req.body.alt, 300);
      if ('caption' in req.body) data.caption = text(req.body.caption, 500);
      res.json(adminPhoto(await prisma.photo.update({ where: { id: photo.id }, data })));
    }),
  );

  r.post(
    '/photos/:id/move',
    json,
    h(async (req, res) => {
      const photo = await loadPhoto(req.params.id);
      await move(prisma, 'photo', { projectId: photo.projectId }, photo.id, req.body?.direction);
      res.json({ ok: true });
    }),
  );

  r.post(
    '/photos/:id/retry',
    h(async (req, res) => {
      const photo = await loadPhoto(req.params.id);
      await prisma.photo.update({ where: { id: photo.id }, data: { status: 'processing', error: null } });
      worker.enqueue(photo.id);
      res.json({ ok: true });
    }),
  );

  // His full-resolution file, exactly as uploaded. Only ever sent to him.
  r.get(
    '/photos/:id/original',
    h(async (req, res) => {
      const photo = await loadPhoto(req.params.id);
      res.set('Cache-Control', 'private, no-store');
      res.download(path.join(dirs.root, photo.originalPath), photo.originalName, { dotfiles: 'allow' });
    }),
  );

  r.delete(
    '/photos/:id',
    h(async (req, res) => {
      const photo = await loadPhoto(req.params.id);
      await moveToTrash(dirs, photo.originalPath);
      await fs.rm(path.join(dirs.derived, photo.id), { recursive: true, force: true });
      await prisma.photo.delete({ where: { id: photo.id } });
      await prisma.project.updateMany({ where: { coverPhotoId: photo.id }, data: { coverPhotoId: null } });
      res.json({ ok: true });
    }),
  );

  // ── Films ─────────────────────────────────────────────────────────────
  r.post(
    '/projects/:id/videos',
    json,
    h(async (req, res) => {
      const p = await loadProject(req.params.id);
      const parsed = parseVideoUrl(req.body?.url || '');
      if (!parsed) throw new HttpError(400, 'Paste a link to a YouTube or Vimeo video.');
      const shape = SHAPES.has(req.body?.shape) ? req.body.shape : parsed.shape;
      const video = await prisma.video.create({
        data: {
          projectId: p.id,
          provider: parsed.provider,
          providerId: parsed.providerId,
          title: text(req.body?.title, 160),
          caption: text(req.body?.caption, 500),
          shape,
          thumbnailUrl: await lookupThumbnail(parsed.provider, parsed.providerId),
          position: await nextPosition(prisma, 'video', { projectId: p.id }),
        },
      });
      res.status(201).json(publicVideo(video));
    }),
  );

  r.patch(
    '/videos/:id',
    json,
    h(async (req, res) => {
      const b = req.body || {};
      const data = {};
      if ('title' in b) data.title = text(b.title, 160);
      if ('caption' in b) data.caption = text(b.caption, 500);
      if ('shape' in b && SHAPES.has(b.shape)) data.shape = b.shape;
      res.json(publicVideo(await prisma.video.update({ where: { id: req.params.id }, data })));
    }),
  );

  r.post(
    '/videos/:id/move',
    json,
    h(async (req, res) => {
      const v = await prisma.video.findUnique({ where: { id: req.params.id } });
      if (!v) throw new HttpError(404, 'Not found');
      await move(prisma, 'video', { projectId: v.projectId }, v.id, req.body?.direction);
      res.json({ ok: true });
    }),
  );

  r.delete(
    '/videos/:id',
    h(async (req, res) => {
      await prisma.video.deleteMany({ where: { id: req.params.id } });
      res.json({ ok: true });
    }),
  );

  // ── Notes ─────────────────────────────────────────────────────────────
  r.get(
    '/notes',
    h(async (req, res) => {
      const status = req.query.status === 'approved' ? 'approved' : 'pending';
      const [notes, pending] = await Promise.all([
        prisma.note.findMany({
          where: { status },
          orderBy: { createdAt: 'desc' },
          take: 200,
          select: { id: true, name: true, message: true, relation: true, status: true, createdAt: true },
        }),
        prisma.note.count({ where: { status: 'pending' } }),
      ]);
      res.json({ notes, pending });
    }),
  );

  r.post(
    '/notes/:id/approve',
    h(async (req, res) => {
      await prisma.note.update({ where: { id: req.params.id }, data: { status: 'approved', approvedAt: new Date() } });
      res.json({ ok: true });
    }),
  );

  r.post(
    '/notes/:id/hide',
    h(async (req, res) => {
      await prisma.note.update({ where: { id: req.params.id }, data: { status: 'pending', approvedAt: null } });
      res.json({ ok: true });
    }),
  );

  r.delete(
    '/notes/:id',
    h(async (req, res) => {
      await prisma.note.deleteMany({ where: { id: req.params.id } });
      res.json({ ok: true });
    }),
  );

  // ── About ─────────────────────────────────────────────────────────────
  r.get(
    '/profile',
    h(async (_req, res) => {
      const p = await prisma.profile.findUnique({ where: { id: 'profile' } });
      res.json({
        displayName: p?.displayName || '',
        intro: p?.intro || '',
        bio: p?.bio || '',
        email: p?.email || '',
        instagram: p?.instagram || '',
        location: p?.location || '',
      });
    }),
  );

  r.put(
    '/profile',
    json,
    h(async (req, res) => {
      const b = req.body || {};
      const email = text(b.email, 200);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'That email address does not look right.');
      const instagram = text(b.instagram, 60)?.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
      if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) throw new HttpError(400, 'That Instagram name does not look right.');
      const data = {
        displayName: text(b.displayName, 120),
        intro: text(b.intro, 300),
        bio: text(b.bio, 5000),
        email,
        instagram: instagram || null,
        location: text(b.location, 120),
      };
      await prisma.profile.upsert({ where: { id: 'profile' }, create: { id: 'profile', ...data }, update: data });
      res.json({ ok: true });
    }),
  );

  return r;
}
