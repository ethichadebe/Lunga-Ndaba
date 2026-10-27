import { randomBytes } from 'node:crypto';

const sessionSecret = process.env.SESSION_SECRET || '';
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  console.warn('[config] SESSION_SECRET is not set: sign-ins will not survive a restart');
}

export const config = {
  port: Number(process.env.PORT || 3003),
  uploadsDir: process.env.UPLOADS_DIR || '/data/uploads',
  // Refuse uploads unless the uploads folder is a mount from outside the
  // container. Only ever turned off for local development and tests.
  requireMountedUploads: process.env.REQUIRE_MOUNTED_UPLOADS !== 'false',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  sessionSecret: sessionSecret || randomBytes(32).toString('hex'),
  maxUploadBytes: 200 * 1024 * 1024,
  // Off in tests, which drive the queue themselves.
  startWorker: process.env.START_WORKER !== 'false',
};
