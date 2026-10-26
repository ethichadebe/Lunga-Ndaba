import { useData } from '../api.js';
import { onLink } from '../router.js';
import { VideoEmbed } from '../VideoEmbed.jsx';

export function Films() {
  const { data, error, loading } = useData('/films');
  if (loading && !data) return <div class="pane"><div class="films"><div class="film film--ghost" /></div></div>;
  if (error) return <div class="pane"><p class="quiet">Films could not be loaded.</p></div>;
  if (!data.films.length) return <div class="pane"><p class="placeholder">No films published yet.</p></div>;
  return (
    <div class="pane">
      <div class="films">
        {data.films.map((v) => (
          <div key={v.id} class="films__item">
            <VideoEmbed video={v} />
            <a class="films__from" href={`/work/${v.project.slug}`} onClick={onLink}>From {v.project.title}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
