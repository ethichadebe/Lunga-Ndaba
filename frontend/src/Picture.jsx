import { useEffect, useRef, useState } from 'preact/hooks';

// How much wider than its box a photo is drawn when cropped to fill it.
// A 3:2 photo in a 4:5 tile is drawn ~1.9x the tile's width, so it needs a
// file that much wider to stay sharp.
export const cropFactor = (photo, boxRatio) => Math.max(1, photo.width / photo.height / boxRatio);

export function croppedSizes(photo, boxRatio, sizes) {
  const f = cropFactor(photo, boxRatio).toFixed(2);
  return sizes.map(([media, width]) => `${media ? `${media} ` : ''}calc(${width} * ${f})`).join(', ');
}

// One photograph, served well: AVIF, then WebP, then JPEG, each at the size
// the screen needs. Width and height are always set so nothing jumps, and the
// dominant colour plus a tiny blur sit underneath until the image arrives.
export function Picture({ photo, sizes, eager = false, priority = false, fit = 'cover', class: cls = '', style }) {
  const img = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth) setLoaded(true);
  }, [photo.id]);

  return (
    <div
      class={`pic ${loaded ? 'is-loaded' : ''} ${cls}`}
      style={{
        backgroundColor: photo.color || 'var(--table)',
        backgroundImage: loaded || !photo.blur ? undefined : `url("${photo.blur}")`,
        ...style,
      }}
    >
      <picture>
        <source type="image/avif" srcSet={photo.avif} sizes={sizes} />
        <source type="image/webp" srcSet={photo.webp} sizes={sizes} />
        <img
          ref={img}
          src={photo.src}
          srcSet={photo.jpeg}
          sizes={sizes}
          width={photo.width}
          height={photo.height}
          alt={photo.alt || ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={priority ? 'high' : undefined}
          style={{ objectFit: fit }}
          onLoad={() => setLoaded(true)}
        />
      </picture>
    </div>
  );
}
