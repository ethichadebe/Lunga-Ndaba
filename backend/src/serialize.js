import { mediaUrl } from './media.js';

const srcset = (photo, ext) => photo.widths.map((w) => `${mediaUrl(photo, w, ext)} ${w}w`).join(', ');

// What a browser needs to show one photo well: sizes in three formats, the
// exact ratio, and a placeholder to sit under it while it loads.
export function publicPhoto(photo) {
  if (!photo || photo.status !== 'ready' || !photo.widths?.length) return null;
  const fallbackWidth = photo.widths.filter((w) => w <= 1200).pop() || photo.widths[0];
  return {
    id: photo.id,
    width: photo.width,
    height: photo.height,
    color: photo.color,
    blur: photo.blur,
    alt: photo.alt || '',
    caption: photo.caption || null,
    avif: srcset(photo, 'avif'),
    webp: srcset(photo, 'webp'),
    jpeg: srcset(photo, 'jpg'),
    src: mediaUrl(photo, fallbackWidth, 'jpg'),
  };
}

export function publicVideo(video) {
  return {
    id: video.id,
    provider: video.provider,
    providerId: video.providerId,
    title: video.title || null,
    caption: video.caption || null,
    shape: video.shape,
    thumbnailUrl: video.thumbnailUrl || null,
  };
}

export function coverOf(project) {
  const ready = (project.photos || []).filter((p) => p.status === 'ready');
  return publicPhoto(ready.find((p) => p.id === project.coverPhotoId) || ready[0]);
}

export function adminPhoto(photo) {
  return {
    ...publicPhoto(photo),
    id: photo.id,
    status: photo.status,
    error: photo.error,
    originalName: photo.originalName,
    bytes: photo.bytes,
    width: photo.width,
    height: photo.height,
    alt: photo.alt || '',
    caption: photo.caption || '',
    position: photo.position,
  };
}
