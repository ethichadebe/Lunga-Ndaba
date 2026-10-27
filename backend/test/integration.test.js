// Runs against a real Postgres when DATABASE_URL is set (see README), and is
// skipped otherwise. It drives the app over HTTP the way the browser does.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const enabled = Boolean(process.env.DATABASE_URL);
const opts = { skip: enabled ? false : 'DATABASE_URL not set' };

let base, server, prisma, worker, dirs, cookie, tmpRoot;
const PASSWORD = 'test-password';

before(async () => {
  if (!enabled) return;
  const { PrismaClient } = await import('@prisma/client');
  const { createApp } = await import('../src/app.js');
  const { layout, ensureLayout } = await import('../src/storage.js');
  const { createWorker } = await import('../src/worker.js');
  prisma = new PrismaClient();
  await prisma.$executeRawUnsafe('TRUNCATE "Photo", "Video", "Project", "Note", "Profile" CASCADE');
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ln-uploads-'));
  dirs = layout(tmpRoot);
  await ensureLayout(dirs);
  worker = createWorker({ prisma, dirs, log: {} });
  await worker.start();
  const config = { adminPassword: PASSWORD, sessionSecret: 's', maxUploadBytes: 50 * 1024 * 1024 };
  const app = createApp({ prisma, config, dirs, getStorage: () => ({ ok: true, mounted: true }), worker });
  await new Promise((r) => {
    server = app.listen(0, r);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!enabled) return;
  server.close();
  await prisma.$disconnect();
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

const call = (method, url, body, headers = {}) =>
  fetch(base + url, {
    method,
    headers: { ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

test('health and an empty gallery', opts, async () => {
  assert.equal((await call('GET', '/health')).status, 200);
  const work = await (await call('GET', '/work')).json();
  assert.deepEqual(work.projects, []);
});

test('admin needs a password', opts, async () => {
  assert.equal((await call('GET', '/admin/projects')).status, 401);
  assert.equal((await call('POST', '/admin/login', { password: 'wrong' })).status, 401);
  const ok = await call('POST', '/admin/login', { password: PASSWORD });
  assert.equal(ok.status, 200);
  cookie = ok.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('GET', '/admin/projects')).status, 200);
});

test('upload keeps the original byte for byte and makes web sizes', opts, async () => {
  const { id } = await (await call('POST', '/admin/projects', { title: 'Placeholder project' })).json();

  const original = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#6a8caf' } })
    .withMetadata({ orientation: 6 })
    .jpeg({ quality: 95 })
    .toBuffer();
  const form = new FormData();
  form.append('file', new Blob([original], { type: 'image/jpeg' }), 'DSC_0001.JPG');
  const res = await call('POST', `/admin/projects/${id}/photos`, form);
  assert.equal(res.status, 201, await res.clone().text());
  const photo = await res.json();
  assert.equal(photo.status, 'processing');
  assert.equal(photo.width, 2000, 'EXIF rotation is applied to the stored size');

  await worker.idle();
  const row = await prisma.photo.findUnique({ where: { id: photo.id } });
  assert.equal(row.status, 'ready');
  assert.deepEqual(row.widths, [400, 800, 1200, 1600, 2000]);
  assert.equal(row.width, 2000, 'the original size is kept, not the web size');
  assert.match(row.blur, /^data:image\/webp;base64,/);
  assert.match(row.color, /^#[0-9a-f]{6}$/);

  const kept = await fs.readFile(path.join(dirs.root, row.originalPath));
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  assert.equal(sha(kept), sha(original), 'original is untouched');

  // Not public until the project is published.
  assert.deepEqual((await (await call('GET', '/work')).json()).projects, []);
  await call('PATCH', `/admin/projects/${id}`, { published: true });
  const work = await (await call('GET', '/work')).json();
  assert.equal(work.projects.length, 1);
  const cover = work.projects[0].cover;
  assert.equal(cover.width, 2000);
  assert.match(cover.avif, /400w.*2000w/);

  const avif = await call('GET', cover.avif.split(' ')[0]);
  assert.equal(avif.status, 200);
  assert.match(avif.headers.get('cache-control'), /immutable/);
  assert.equal(avif.headers.get('content-type'), 'image/avif');
  const webp = await call('GET', cover.webp.split(' ')[0]);
  assert.equal(webp.headers.get('content-type'), 'image/webp');
  const derived = await sharp(Buffer.from(await avif.arrayBuffer())).metadata();
  assert.equal(derived.format, 'heif');
  assert.equal(derived.exif, undefined, 'metadata is stripped from web copies');

  // The original is never reachable through /media.
  assert.equal((await call('GET', `/media/../${row.originalPath}`)).status, 404);
  assert.equal((await call('GET', `/media/../originals/${row.id}/DSC_0001.JPG`)).status, 404);

  // He can download it back.
  const back = await call('GET', `/admin/photos/${row.id}/original`);
  assert.equal(back.status, 200);
  assert.equal(sha(Buffer.from(await back.arrayBuffer())), sha(original));

  // Removing moves the original to trash rather than deleting it.
  assert.equal((await call('DELETE', `/admin/photos/${row.id}`)).status, 200);
  const trash = await fs.readdir(dirs.trash);
  assert.equal(trash.length, 1);
  assert.equal(sha(await fs.readFile(path.join(dirs.trash, trash[0]))), sha(original));
});

test('a non-image is refused and nothing is kept', opts, async () => {
  const { id } = await (await call('POST', '/admin/projects', { title: 'Another' })).json();
  const form = new FormData();
  form.append('file', new Blob(['hello'], { type: 'image/jpeg' }), 'fake.jpg');
  const res = await call('POST', `/admin/projects/${id}/photos`, form);
  assert.equal(res.status, 415);
  assert.deepEqual(await fs.readdir(dirs.tmp), []);
});

test('uploads are refused when storage is not mounted', opts, async () => {
  const { createApp } = await import('../src/app.js');
  const app = createApp({
    prisma,
    config: { adminPassword: PASSWORD, sessionSecret: 's', maxUploadBytes: 1e6 },
    dirs,
    getStorage: () => ({ ok: false, mounted: false }),
    worker,
  });
  const s = await new Promise((r) => {
    const x = app.listen(0, () => r(x));
  });
  const url = `http://127.0.0.1:${s.address().port}`;
  const health = await (await fetch(`${url}/health`)).json();
  assert.equal(health.uploads, 'not-mounted');
  const { id } = await prisma.project.findFirst();
  const form = new FormData();
  form.append('file', new Blob(['x']), 'a.jpg');
  const res = await fetch(`${url}/admin/projects/${id}/photos`, { method: 'POST', body: form, headers: { cookie } });
  assert.equal(res.status, 503);
  s.close();
});

test('notes stay private until approved, and are rate limited', opts, async () => {
  const note = (n) => ({ name: `Visitor ${n}`, message: 'Beautiful light.', startedAt: Date.now() - 10_000 });
  for (let i = 0; i < 3; i += 1) assert.equal((await call('POST', '/notes', note(i))).status, 201);
  assert.equal((await call('POST', '/notes', note(4))).status, 429);
  assert.deepEqual((await (await call('GET', '/notes')).json()).notes, []);

  const { notes } = await (await call('GET', '/admin/notes?status=pending')).json();
  assert.equal(notes.length, 3);
  await call('POST', `/admin/notes/${notes[0].id}/approve`);
  const shown = (await (await call('GET', '/notes')).json()).notes;
  assert.equal(shown.length, 1);
  assert.equal(shown[0].ipHash, undefined, 'no address data is published');
  await call('DELETE', `/admin/notes/${notes[0].id}`);
  assert.deepEqual((await (await call('GET', '/notes')).json()).notes, []);
});

test('films from a pasted link', opts, async () => {
  const p = await prisma.project.findFirst({ where: { published: true } });
  const res = await call('POST', `/admin/projects/${p.id}/videos`, { url: 'https://youtu.be/dQw4w9WgXcQ' });
  assert.equal(res.status, 201);
  const films = (await (await call('GET', '/films')).json()).films;
  assert.equal(films.length, 1);
  assert.equal(films[0].provider, 'youtube');
  assert.equal((await call('POST', `/admin/projects/${p.id}/videos`, { url: 'https://example.com/x.mp4' })).status, 400);
});
