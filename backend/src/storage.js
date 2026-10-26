import fs from 'node:fs/promises';
import path from 'node:path';

// Layout of the uploads folder. Everything lives under one root so a move from
// tmp/ to originals/ is a rename on the same disk, never a copy.
export function layout(root) {
  return {
    root,
    originals: path.join(root, 'originals'),
    derived: path.join(root, 'derived'),
    trash: path.join(root, 'trash'),
    tmp: path.join(root, 'tmp'),
  };
}

// Is the uploads folder on a different device from the container's own disk?
// A bind mount or a volume always is. A plain folder inside the container is
// not, and anything written there is lost at the next deploy without a sound.
export async function isMounted(dir, rootDir = '/') {
  const [a, b] = await Promise.all([fs.stat(dir), fs.stat(rootDir)]);
  return a.dev !== b.dev;
}

export async function checkStorage(dir, { requireMount }) {
  const result = { mounted: false, writable: false, ok: false, reason: null };
  try {
    await fs.mkdir(dir, { recursive: true });
    result.mounted = await isMounted(dir);
    const probe = path.join(dir, `.probe-${process.pid}`);
    await fs.writeFile(probe, 'ok');
    await fs.unlink(probe);
    result.writable = true;
  } catch (err) {
    result.reason = `uploads folder is not usable: ${err.code || err.message}`;
  }
  if (result.writable && !result.mounted && requireMount) {
    result.reason = 'uploads folder is not mounted from outside the container';
  }
  result.ok = result.writable && (result.mounted || !requireMount);
  return result;
}

export async function ensureLayout(dirs) {
  for (const d of [dirs.originals, dirs.derived, dirs.trash, dirs.tmp]) {
    await fs.mkdir(d, { recursive: true });
  }
}

// A file name that is safe on disk and still recognisable when he downloads it.
export function safeFileName(name) {
  const base = path.basename(String(name || 'photo'));
  const cleaned = base
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .slice(-120);
  return cleaned || 'photo';
}

// Removing a photo never deletes his original: it goes to trash/, stamped.
export async function moveToTrash(dirs, relPath) {
  const from = path.join(dirs.root, relPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const to = path.join(dirs.trash, `${stamp}__${relPath.replace(/[\\/]/g, '__')}`);
  await fs.mkdir(dirs.trash, { recursive: true });
  try {
    await fs.rename(from, to);
    // Tidy the now-empty folder the original lived in.
    await fs.rmdir(path.dirname(from)).catch(() => {});
    return to;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}
