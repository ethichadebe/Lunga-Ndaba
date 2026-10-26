import { useEffect, useRef, useState } from 'preact/hooks';
import { Picture } from './Picture.jsx';
import { CloseGlyph, BackGlyph, NextGlyph } from './icons.jsx';

// Full screen, black, no window chrome: here the frame steps aside for the work.
export function Viewer({ photos, index: start, title, onClose }) {
  const [index, setIndex] = useState(start);
  const [idle, setIdle] = useState(false);
  const touch = useRef(null);
  const timer = useRef(null);
  const closeBtn = useRef(null);
  const photo = photos[index];
  const go = (d) => setIndex((i) => (i + d + photos.length) % photos.length);

  const wake = () => {
    setIdle(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setIdle(true), 2500);
  };

  useEffect(() => {
    const prev = document.activeElement;
    closeBtn.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      wake();
    };
    window.addEventListener('keydown', onKey);
    wake();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      clearTimeout(timer.current);
      prev?.focus?.();
    };
  }, []);

  const r = photo.width / photo.height;
  return (
    <div
      class={`viewer ${idle ? 'is-idle' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${title}: photo ${index + 1} of ${photos.length}`}
      onPointerMove={wake}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; wake(); }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      <Picture
        key={photo.id}
        photo={photo}
        fit="contain"
        eager
        priority
        sizes={`min(100vw, ${Math.round(r * 100)}vh)`}
        class="viewer__pic"
      />
      <div class="viewer__top">
        <span class="viewer__count">{index + 1} / {photos.length}</span>
        <button ref={closeBtn} type="button" class="viewer__btn" onClick={onClose} aria-label="Close"><CloseGlyph size={22} /></button>
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" class="viewer__btn viewer__prev" onClick={() => go(-1)} aria-label="Previous photo"><BackGlyph size={26} /></button>
          <button type="button" class="viewer__btn viewer__next" onClick={() => go(1)} aria-label="Next photo"><NextGlyph size={26} /></button>
        </>
      )}
      {photo.caption && <p class="viewer__caption">{photo.caption}</p>}
      {/* The neighbours, fetched ahead in the same format and size the viewer
          will ask for, so the next swipe is instant. */}
      <div class="viewer__ahead" aria-hidden="true">
        {[photos[index + 1], photos[index - 1]].filter(Boolean).map((p) => (
          <Picture key={p.id} photo={p} eager sizes={`min(100vw, ${Math.round((p.width / p.height) * 100)}vh)`} />
        ))}
      </div>
    </div>
  );
}
