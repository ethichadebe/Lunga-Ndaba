import { useData } from '../api.js';
import { Picture } from '../Picture.jsx';
import { VideoEmbed } from '../VideoEmbed.jsx';

// One shoot. Photos in justified rows, each at its own ratio, never cropped.
export function Project({ slug, onView }) {
  const { data, error, loading } = useData(`/work/${slug}`);
  if (loading && !data) return <div class="pane"><div class="rows">{[1.5, 0.8, 1.5, 1.33].map((r, i) => <div key={i} class="row-item row-item--ghost" style={{ '--r': r }} />)}</div></div>;
  if (error) return <div class="pane"><p class="quiet">{error.status === 404 ? 'This project is not available.' : 'This project could not be loaded.'}</p></div>;
  const meta = [data.dateLabel, data.location].filter(Boolean).join(' · ');
  return (
    <article class="pane pane--project">
      <header class="project__head">
        <h1>{data.title}</h1>
        {meta && <p class="project__meta">{meta}</p>}
        {data.summary && <p class="project__summary">{data.summary}</p>}
      </header>
      {data.photos.length > 0 && (
        <div class="rows">
          {data.photos.map((photo, i) => {
            const r = photo.width / photo.height;
            return (
              <button
                key={photo.id}
                type="button"
                class="row-item"
                style={{ '--r': r }}
                onClick={() => onView({ photos: data.photos, index: i, title: data.title })}
                aria-label={photo.alt ? `View: ${photo.alt}` : `View photo ${i + 1} of ${data.photos.length}`}
              >
                <Picture
                  photo={photo}
                  sizes={`(max-width: 760px) 100vw, ${Math.round(Math.min(r, 2.4) * 460)}px`}
                  eager={i < 4}
                  priority={i === 0}
                />
              </button>
            );
          })}
        </div>
      )}
      {data.videos.length > 0 && (
        <section class="films" aria-label="Films">
          {data.videos.map((v) => <VideoEmbed key={v.id} video={v} />)}
        </section>
      )}
      {!data.photos.length && !data.videos.length && <p class="placeholder">Nothing in this project yet.</p>}
    </article>
  );
}
