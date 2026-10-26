import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './util.js';

const COOKIE = 'ln_admin';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const sha = (s) => createHash('sha256').update(String(s)).digest();

export function passwordMatches(input, expected) {
  if (!expected) return false;
  return timingSafeEqual(sha(input), sha(expected));
}

function sign(secret, exp) {
  return createHmac('sha256', secret).update(`admin.${exp}`).digest('base64url');
}

export function makeToken(secret, now = Date.now()) {
  const exp = now + THIRTY_DAYS;
  return `${exp}.${sign(secret, exp)}`;
}

export function tokenValid(secret, token, now = Date.now()) {
  if (typeof token !== 'string') return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now || !sig) return false;
  const expected = Buffer.from(sign(secret, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function setSession(res, req, secret) {
  res.cookie(COOKIE, makeToken(secret), {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure,
    maxAge: THIRTY_DAYS,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

export const isSignedIn = (req, secret) => tokenValid(secret, req.cookies?.[COOKIE]);

export function requireAdmin(secret) {
  return (req, _res, next) => (isSignedIn(req, secret) ? next() : next(new HttpError(401, 'Please sign in.')));
}

// A small in-memory limiter for sign-in attempts. Losing it on restart is fine:
// it slows guessing, it does not need to be durable.
export function attemptLimiter({ max, windowMs }) {
  const hits = new Map();
  return {
    take(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || entry.resetAt < now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
    reset(key) {
      hits.delete(key);
    },
  };
}
