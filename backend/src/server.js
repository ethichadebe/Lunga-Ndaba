import { config } from './config.js';
import { prisma } from './db.js';
import { createApp } from './app.js';
import { layout, checkStorage, ensureLayout } from './storage.js';
import { createWorker } from './worker.js';

const dirs = layout(config.uploadsDir);
let storage = await checkStorage(dirs.root, { requireMount: config.requireMountedUploads });

if (storage.ok) {
  await ensureLayout(dirs);
  console.log(`[uploads] ${dirs.root} is ${storage.mounted ? 'mounted from outside the container' : 'local (development)'}`);
} else {
  // Loud, but not fatal: /health and /work must still answer for the deploy
  // check, which runs the candidate with no uploads mounted.
  console.warn(`[uploads] UPLOADS ARE SWITCHED OFF: ${storage.reason} (${dirs.root})`);
}

const worker = createWorker({ prisma, dirs });
const app = createApp({ prisma, config, dirs, getStorage: () => storage, worker });

const server = app.listen(config.port, () => console.log(`[server] listening on ${config.port}`));
server.requestTimeout = 15 * 60 * 1000; // big originals over mobile data take a while

if (storage.ok && config.startWorker) {
  const n = await worker.start();
  if (n) console.log(`[worker] resumed ${n} photo(s) left processing`);
}

// Re-check now and then, so a folder that stops being writable is noticed.
setInterval(async () => {
  storage = await checkStorage(dirs.root, { requireMount: config.requireMountedUploads });
}, 60_000).unref();

const stop = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
