import { createHash } from 'node:crypto';
import { HttpError, text } from './util.js';

export const LIMITS = { perHour: 3, perDay: 6, pendingCap: 300, minFillMs: 3000 };

export const hashIp = (ip, secret) => createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32);

// Check a note for shape and obvious spam. Throws a plain-language error.
export function validateNote(body, now = Date.now()) {
  if (body?.website) throw new HttpError(400, 'Something went wrong. Please try again.');
  const started = Number(body?.startedAt);
  if (!Number.isFinite(started) || now - started < LIMITS.minFillMs || now - started > 24 * 3600 * 1000) {
    throw new HttpError(400, 'Please take a moment over your note, then send it again.');
  }
  const name = text(body?.name, 80);
  const message = text(body?.message, 1000);
  const relation = text(body?.relation, 80);
  if (!name) throw new HttpError(400, 'Please add your name.');
  if (!message || message.length < 2) throw new HttpError(400, 'Please write a note.');
  const all = `${name} ${message} ${relation || ''}`;
  if (/https?:\/\/|www\.|<a\s|\[url/i.test(all)) throw new HttpError(400, 'Notes cannot include links.');
  return { name, message, relation };
}

// Counted in the database, so a restart or a deploy does not reset it.
export async function checkRate(prisma, ipHash, now = Date.now()) {
  const hourAgo = new Date(now - 3600 * 1000);
  const dayAgo = new Date(now - 24 * 3600 * 1000);
  const [lastHour, lastDay, pending] = await Promise.all([
    prisma.note.count({ where: { ipHash, createdAt: { gte: hourAgo } } }),
    prisma.note.count({ where: { ipHash, createdAt: { gte: dayAgo } } }),
    prisma.note.count({ where: { status: 'pending' } }),
  ]);
  if (pending >= LIMITS.pendingCap) {
    throw new HttpError(503, 'The note box is full for now. Please try again in a few days.');
  }
  if (lastHour >= LIMITS.perHour || lastDay >= LIMITS.perDay) {
    throw new HttpError(429, 'Thanks — that is enough notes for now. Please try again later.');
  }
}
