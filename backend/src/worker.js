import path from 'node:path';
import fs from 'node:fs/promises';
import { renderPhoto, pruneDerived } from './media.js';

// One photo at a time, in the background, so a small server stays responsive
// while he uploads a whole shoot from his phone.
export function createWorker({ prisma, dirs, log = console }) {
  const queued = new Set();
  let chain = Promise.resolve();
  let enabled = false;

  async function run(id) {
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo || photo.status === 'ready') return;
    const original = path.join(dirs.root, photo.originalPath);
    try {
      await fs.access(original);
    } catch {
      await prisma.photo.update({ where: { id }, data: { status: 'failed', error: 'The original file is missing.' } });
      return;
    }
    const outDir = path.join(dirs.derived, photo.id);
    try {
      const out = await renderPhoto(original, outDir);
      // The photo may have been removed while it was being processed.
      const still = await prisma.photo.findUnique({ where: { id }, select: { id: true } });
      if (!still) {
        await fs.rm(outDir, { recursive: true, force: true });
        return;
      }
      await prisma.photo.update({
        where: { id },
        data: { status: 'ready', error: null, ...out },
      });
      await pruneDerived(outDir, out.version);
      log.info?.(`[worker] ${id} ready (${out.widths.join(', ')})`);
    } catch (err) {
      log.error?.(`[worker] ${id} failed`, err);
      await prisma.photo
        .update({ where: { id }, data: { status: 'failed', error: 'This photo could not be prepared.' } })
        .catch(() => {});
    }
  }

  function enqueue(id) {
    if (!enabled || queued.has(id)) return;
    queued.add(id);
    chain = chain.then(() => run(id)).catch(() => {}).finally(() => queued.delete(id));
  }

  return {
    enqueue,
    // Only start when the uploads folder is real. A candidate deploy runs with
    // no uploads mounted and shares the live database: if it ran the queue it
    // would mark his photos as failed for want of files it cannot see.
    async start() {
      enabled = true;
      const pending = await prisma.photo.findMany({ where: { status: 'processing' }, select: { id: true } });
      pending.forEach((p) => enqueue(p.id));
      return pending.length;
    },
    idle: () => chain,
    get enabled() {
      return enabled;
    },
  };
}
