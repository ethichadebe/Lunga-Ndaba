import express from 'express';
import { h, HttpError } from '../util.js';
import { publicPhoto, publicVideo, coverOf } from '../serialize.js';
import { validateNote, checkRate, hashIp } from '../notes.js';

const byPosition = [{ position: 'asc' }, { createdAt: 'asc' }];

export function publicRoutes({ prisma, config, getStorage }) {
  const r = express.Router();

  // The deploy checks this from inside the container. It proves the database
  // answers; `uploads` says whether photos can be stored safely right now.
  r.get(
    '/health',
    h(async (_req, res) => {
      await prisma.$queryRaw`SELECT 1`;
      const s = getStorage();
      res.json({ ok: true, uploads: s.ok ? 'mounted' : s.mounted ? 'not-writable' : 'not-mounted' });
    }),
  );

  // Every published project, in his order, with its cover. Read from the
  // database on every call: this is what proves the gallery survived a deploy.
  r.get(
    '/work',
    h(async (_req, res) => {
      const projects = await prisma.project.findMany({
        where: { published: true },
        orderBy: byPosition,
        include: {
          photos: { where: { status: 'ready' }, orderBy: byPosition },
          _count: { select: { videos: true } },
        },
      });
      res.set('Cache-Control', 'no-cache');
      res.json({
        projects: projects.map((p) => ({
          slug: p.slug,
          title: p.title,
          summary: p.summary,
          dateLabel: p.dateLabel,
          location: p.location,
          cover: coverOf(p),
          photoCount: p.photos.length,
          videoCount: p._count.videos,
        })),
      });
    }),
  );

  r.get(
    '/work/:slug',
    h(async (req, res) => {
      const p = await prisma.project.findFirst({
        where: { slug: req.params.slug, published: true },
        include: {
          photos: { where: { status: 'ready' }, orderBy: byPosition },
          videos: { orderBy: byPosition },
        },
      });
      if (!p) throw new HttpError(404, 'Not found');
      res.set('Cache-Control', 'no-cache');
      res.json({
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        dateLabel: p.dateLabel,
        location: p.location,
        photos: p.photos.map(publicPhoto).filter(Boolean),
        videos: p.videos.map(publicVideo),
      });
    }),
  );

  r.get(
    '/films',
    h(async (_req, res) => {
      const videos = await prisma.video.findMany({
        where: { project: { published: true } },
        orderBy: [{ project: { position: 'asc' } }, ...byPosition],
        include: { project: { select: { slug: true, title: true } } },
      });
      res.set('Cache-Control', 'no-cache');
      res.json({ films: videos.map((v) => ({ ...publicVideo(v), project: v.project })) });
    }),
  );

  r.get(
    '/profile',
    h(async (_req, res) => {
      const p = await prisma.profile.findUnique({ where: { id: 'profile' } });
      res.set('Cache-Control', 'no-cache');
      res.json({
        displayName: p?.displayName || null,
        intro: p?.intro || null,
        bio: p?.bio || null,
        email: p?.email || null,
        instagram: p?.instagram || null,
        location: p?.location || null,
      });
    }),
  );

  r.get(
    '/notes',
    h(async (_req, res) => {
      const notes = await prisma.note.findMany({
        where: { status: 'approved' },
        orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
        take: 100,
        select: { id: true, name: true, message: true, relation: true, createdAt: true },
      });
      res.set('Cache-Control', 'no-cache');
      res.json({ notes });
    }),
  );

  r.post(
    '/notes',
    express.json({ limit: '8kb' }),
    h(async (req, res) => {
      const note = validateNote(req.body);
      const ipHash = hashIp(req.ip || 'unknown', config.sessionSecret);
      await checkRate(prisma, ipHash);
      await prisma.note.create({ data: { ...note, ipHash } });
      res.status(201).json({ ok: true });
    }),
  );

  return r;
}
