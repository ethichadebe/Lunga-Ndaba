import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';

// Express's type table predates AVIF; name every format we write.
const MEDIA_TYPES = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg' };

export function createApp({ prisma, config, dirs, getStorage, worker }) {
  const app = express();
  app.disable('x-powered-by');
  // Requests arrive through nginx (and usually a TLS proxy before it). Trust
  // private-network hops only, so the client address can't be forged.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(cookieParser());

  // Web sizes only. Originals live in a sibling folder and are never served here.
  app.use(
    '/media',
    express.static(dirs.derived, {
      immutable: true,
      maxAge: '365d',
      index: false,
      dotfiles: 'deny',
      fallthrough: false,
      setHeaders: (res, file) => {
        const type = MEDIA_TYPES[file.slice(file.lastIndexOf('.') + 1)];
        if (type) res.setHeader('Content-Type', type);
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  app.use(publicRoutes({ prisma, config, getStorage }));
  app.use('/admin', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/admin', adminRoutes({ prisma, config, dirs, getStorage, worker }));

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message;
    if (err instanceof multer.MulterError) {
      status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      message = err.code === 'LIMIT_FILE_SIZE' ? 'That photo is too large (200 MB at most).' : 'The upload did not work.';
    } else if (err.code === 'P2025') {
      status = 404;
      message = 'Not found';
    } else if (status >= 500 && status !== 503) {
      console.error(err);
      message = 'Something went wrong on our side.';
    }
    if (status === 404 && err.code === 'ENOENT') message = 'Not found';
    res.status(status).json({ error: message });
  });

  return app;
}
