import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

// The web sizes. Never larger than the original; the original itself is never served.
export const WIDTHS = [400, 800, 1200, 1600, 2400];
export const FORMATS = ['avif', 'webp', 'jpg'];

sharp.cache(false);
sharp.concurrency(2);

export function plannedWidths(width) {
  const list = WIDTHS.filter((w) => w <= width);
  if (width < WIDTHS[WIDTHS.length - 1] && !list.includes(width)) list.push(width);
  return list;
}

export function mediaUrl(photo, width, ext) {
  return `/media/${photo.id}/${photo.version}-${width}.${ext}`;
}

// Width and height as the picture will be shown, after EXIF rotation.
export function orientedSize(meta) {
  const swap = meta.orientation >= 5 && meta.orientation <= 8;
  return swap ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height };
}

const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'tiff']);

export async function inspectUpload(file) {
  let meta;
  try {
    meta = await sharp(file, { failOn: 'none' }).metadata();
  } catch {
    return { ok: false, reason: 'That file is not a photo this site can read.' };
  }
  if (meta.format === 'heif') {
    return { ok: false, reason: 'HEIC photos cannot be used yet. Export as JPEG, or set the camera to "Most Compatible".' };
  }
  if (!ACCEPTED.has(meta.format)) {
    return { ok: false, reason: `This site takes JPEG, PNG, WebP or TIFF photos (this one is ${meta.format || 'unknown'}).` };
  }
  const { width, height } = orientedSize(meta);
  return { ok: true, format: meta.format, width, height };
}

const ENCODERS = {
  avif: (img) => img.avif({ quality: 55, effort: 4 }),
  webp: (img) => img.webp({ quality: 78 }),
  jpg: (img) => img.jpeg({ quality: 80, mozjpeg: true, progressive: true }),
};

// Make every web size of one original. Returns what to store on the Photo row.
export async function renderPhoto(originalFile, outDir) {
  const version = randomBytes(4).toString('hex');
  // Decode the original once into a bounded master, then make each size from that.
  const { data, info } = await sharp(originalFile, { failOn: 'none', limitInputPixels: 400_000_000 })
    .rotate()
    .toColorspace('srgb')
    .resize({ width: WIDTHS[WIDTHS.length - 1], withoutEnlargement: true })
    .removeAlpha()
    .raw({ depth: 'uchar' })
    .toBuffer({ resolveWithObject: true });
  const raw = { raw: { width: info.width, height: info.height, channels: info.channels } };
  const widths = plannedWidths(info.width);

  await fs.mkdir(outDir, { recursive: true });
  for (const w of widths) {
    for (const ext of FORMATS) {
      const target = path.join(outDir, `${version}-${w}.${ext}`);
      const tmp = `${target}.part`;
      await ENCODERS[ext](sharp(data, raw).resize({ width: w })).toFile(tmp);
      await fs.rename(tmp, target);
    }
  }

  const stats = await sharp(data, raw).stats();
  const { r, g, b } = stats.dominant;
  const color = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  const tiny = await sharp(data, raw).resize({ width: 16 }).blur(0.6).webp({ quality: 40 }).toBuffer();
  const blur = `data:image/webp;base64,${tiny.toString('base64')}`;

  // Width and height stay as measured from the original at upload; only the
  // ratio matters here, and resizing keeps it.
  return { version, widths, color, blur };
}

// Remove every derived file except the current version.
export async function pruneDerived(outDir, keepVersion) {
  let names = [];
  try {
    names = await fs.readdir(outDir);
  } catch {
    return;
  }
  await Promise.all(
    names.filter((n) => !n.startsWith(`${keepVersion}-`)).map((n) => fs.rm(path.join(outDir, n), { force: true })),
  );
}
