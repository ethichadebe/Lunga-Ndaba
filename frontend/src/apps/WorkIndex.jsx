import { onLink } from '../router.js';
import { Picture, croppedSizes } from '../Picture.jsx';

// Every project, as a big cover. The first thing a visitor sees.
export function WorkIndex({ state }) {
  const { data, error, loading } = state;
  if (loading && !data) return <div class="pane"><div class="covers">{[0, 1, 2].map((i) => <div key={i} class="cover cover--ghost" />)}</div></div>;
  if (error) return <div class="pane"><p class="quiet">The work could not be loaded. Please try again in a moment.</p></div>;
  const projects = data.projects;
  if (!projects.length) {
    return (
      <div class="pane">
        <p class="placeholder">No work published yet.</p>
      </div>
    );
  }
  return (
    <div class="pane">
      <div class="covers">
        {projects.map((p, i) => (
          <a key={p.slug} href={`/work/${p.slug}`} onClick={onLink} class="cover">
            {p.cover ? (
              <Picture
                photo={p.cover}
                sizes={croppedSizes(p.cover, 0.8, [['(max-width: 760px)', '100vw'], ['(max-width: 1200px)', '45vw'], ['', '380px']])}
                eager={i < 3}
                priority={i === 0}
              />
            ) : (
              <span class="cover__empty" />
            )}
            <span class="cover__caption">
              <span class="cover__title">{p.title}</span>
              <span class="cover__meta">{[p.dateLabel, p.location].filter(Boolean).join(' · ')}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
