import { useState } from 'preact/hooks';
import { PlayMark, FilmsIcon } from './icons.jsx';

// The player is only loaded when someone presses play. Until then it costs
// one thumbnail. No video is ever stored or served by this site.
function embedUrl(v) {
  if (v.provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${v.providerId}?autoplay=1&rel=0&playsinline=1`;
  }
  const [id, hash] = v.providerId.split(':');
  const h = hash ? `h=${hash}&` : '';
  return `https://player.vimeo.com/video/${id}?${h}autoplay=1&dnt=1&title=0&byline=0&portrait=0`;
}

export function VideoEmbed({ video }) {
  const [playing, setPlaying] = useState(false);
  const title = video.title || 'Film';
  return (
    <figure class={`film film--${video.shape}`}>
      <div class="film__frame">
        {playing ? (
          <iframe
            src={embedUrl(video)}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        ) : (
          <button type="button" class="film__poster" onClick={() => setPlaying(true)} aria-label={`Play ${title}`}>
            {video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span class="film__blank"><FilmsIcon size={56} /></span>
            )}
            <span class="film__play"><PlayMark size={64} /></span>
          </button>
        )}
      </div>
      {(video.title || video.caption) && (
        <figcaption>
          {video.title && <strong>{video.title}</strong>}
          {video.caption && <span>{video.caption}</span>}
        </figcaption>
      )}
    </figure>
  );
}
