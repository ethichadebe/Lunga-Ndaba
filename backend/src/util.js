// Express 4 does not catch rejected promises; this passes them to the error handler.
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// A short, plain string from user input, or null when blank.
export function text(value, max) {
  if (value === undefined || value === null) return null;
  const s = String(value).replace(/\r\n/g, '\n').trim();
  if (!s) return null;
  if (s.length > max) throw new HttpError(400, `That is too long (${max} characters at most).`);
  return s;
}

export function slugify(title) {
  const s = String(title)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return s || 'project';
}
