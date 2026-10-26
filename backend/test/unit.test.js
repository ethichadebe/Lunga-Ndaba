import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { plannedWidths, orientedSize } from '../src/media.js';
import { parseVideoUrl } from '../src/video.js';
import { validateNote } from '../src/notes.js';
import { makeToken, tokenValid, passwordMatches } from '../src/auth.js';
import { slugify } from '../src/util.js';
import { safeFileName } from '../src/storage.js';

test('web sizes never exceed the original', () => {
  assert.deepEqual(plannedWidths(6000), [400, 800, 1200, 1600, 2400]);
  assert.deepEqual(plannedWidths(1000), [400, 800, 1000]);
  assert.deepEqual(plannedWidths(2400), [400, 800, 1200, 1600, 2400]);
  assert.deepEqual(plannedWidths(300), [300]);
});

test('EXIF rotation swaps width and height', () => {
  assert.deepEqual(orientedSize({ width: 6000, height: 4000, orientation: 6 }), { width: 4000, height: 6000 });
  assert.deepEqual(orientedSize({ width: 6000, height: 4000, orientation: 1 }), { width: 6000, height: 4000 });
});

test('video links', () => {
  const yt = { provider: 'youtube', providerId: 'dQw4w9WgXcQ', shape: 'landscape' };
  assert.deepEqual(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), yt);
  assert.deepEqual(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?si=abc'), yt);
  assert.deepEqual(parseVideoUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), yt);
  assert.equal(parseVideoUrl('https://youtube.com/shorts/dQw4w9WgXcQ').shape, 'vertical');
  assert.deepEqual(parseVideoUrl('https://vimeo.com/76979871'), { provider: 'vimeo', providerId: '76979871', shape: 'landscape' });
  assert.equal(parseVideoUrl('https://vimeo.com/76979871/abc123def0').providerId, '76979871:abc123def0');
  assert.equal(parseVideoUrl('https://player.vimeo.com/video/76979871?h=abc123def0').providerId, '76979871:abc123def0');
  assert.equal(parseVideoUrl('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(parseVideoUrl('not a link'), null);
});

test('notes: honeypot, timing, length and links', () => {
  const now = Date.now();
  const ok = { name: 'A', message: 'Lovely work', startedAt: now - 10_000 };
  assert.deepEqual(validateNote(ok, now), { name: 'A', message: 'Lovely work', relation: null });
  assert.throws(() => validateNote({ ...ok, website: 'x' }, now));
  assert.throws(() => validateNote({ ...ok, startedAt: now - 500 }, now));
  assert.throws(() => validateNote({ ...ok, message: 'see https://spam.example' }, now));
  assert.throws(() => validateNote({ ...ok, message: 'x'.repeat(1001) }, now));
  assert.throws(() => validateNote({ ...ok, name: '  ' }, now));
});

test('admin session tokens', () => {
  const t = makeToken('secret', 1000);
  assert.ok(tokenValid('secret', t, 2000));
  assert.ok(!tokenValid('other', t, 2000));
  assert.ok(!tokenValid('secret', t, 1000 + 31 * 24 * 3600 * 1000));
  assert.ok(!tokenValid('secret', `9999999999999.${t.split('.')[1]}`, 2000));
  assert.ok(passwordMatches('pw', 'pw'));
  assert.ok(!passwordMatches('pw', ''));
});

test('slugs and file names', () => {
  assert.equal(slugify('Soweto, Winter — 2025'), 'soweto-winter-2025');
  assert.equal(slugify('Ñandú Café'), 'nandu-cafe');
  assert.equal(slugify('!!!'), 'project');
  assert.equal(safeFileName('../../etc/passwd'), 'passwd');
  assert.equal(safeFileName('DSC 0042 (final).JPG'), 'DSC_0042_final_.JPG');
});

// The same pattern the deploy dispatcher uses to refuse a migration
// (ethichadebe/workflows server/md-deploy-root, destructive_sql).
test('every migration passes the deploy gate', () => {
  const gate = /DROP\s+TABLE|DROP\s+COLUMN|DROP\s+CONSTRAINT|DROP\s+SCHEMA|DROP\s+DATABASE|RENAME|TRUNCATE|DELETE\s+FROM|SET\s+NOT\s+NULL|ALTER\s+COLUMN[^;]*TYPE/i;
  const dir = new URL('../prisma/migrations/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^\d{6,}_/.test(n));
  assert.ok(names.length > 0);
  for (const n of names) {
    const lines = readFileSync(new URL(`${n}/migration.sql`, dir), 'utf8').split('\n');
    lines.forEach((line, i) => assert.ok(!gate.test(line), `${n}/migration.sql:${i + 1} would be refused: ${line}`));
  }
});
