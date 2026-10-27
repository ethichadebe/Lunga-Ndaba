// Turn a pasted YouTube or Vimeo link into what we store. Nothing is downloaded.
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseVideoUrl(input) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be' && YT_ID.test(parts[0] || '')) {
    return { provider: 'youtube', providerId: parts[0], shape: 'landscape' };
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const v = url.searchParams.get('v');
    if (parts[0] === 'watch' && YT_ID.test(v || '')) return { provider: 'youtube', providerId: v, shape: 'landscape' };
    if (['embed', 'live', 'v'].includes(parts[0]) && YT_ID.test(parts[1] || '')) {
      return { provider: 'youtube', providerId: parts[1], shape: 'landscape' };
    }
    if (parts[0] === 'shorts' && YT_ID.test(parts[1] || '')) {
      return { provider: 'youtube', providerId: parts[1], shape: 'vertical' };
    }
    return null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const idx = parts.findIndex((p) => /^\d{5,12}$/.test(p));
    if (idx === -1) return null;
    const id = parts[idx];
    // Unlisted videos carry a hash, either as the next path part or as ?h=.
    const hash = url.searchParams.get('h') || (/^[0-9a-f]{6,20}$/.test(parts[idx + 1] || '') ? parts[idx + 1] : null);
    return { provider: 'vimeo', providerId: hash ? `${id}:${hash}` : id, shape: 'landscape' };
  }
  return null;
}

export function videoPageUrl(provider, providerId) {
  if (provider === 'youtube') return `https://www.youtube.com/watch?v=${providerId}`;
  const [id, hash] = providerId.split(':');
  return hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`;
}

export async function lookupThumbnail(provider, providerId, fetchImpl = fetch) {
  if (provider === 'youtube') return `https://i.ytimg.com/vi/${providerId}/hqdefault.jpg`;
  try {
    const page = videoPageUrl(provider, providerId);
    const res = await fetchImpl(`https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(page)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body.thumbnail_url === 'string' && body.thumbnail_url.startsWith('https://') ? body.thumbnail_url : null;
  } catch {
    return null;
  }
}
