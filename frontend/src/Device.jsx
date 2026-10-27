import { useEffect, useRef, useState } from 'preact/hooks';
import { navigate, usePath, onLink } from './router.js';
import { useData } from './api.js';
import { APPS, MarkIcon, NotesIcon, AboutIcon, OutboundCameraIcon, BackGlyph, UpGlyph } from './icons.jsx';
import { Picture, croppedSizes } from './Picture.jsx';
import { Viewer } from './Viewer.jsx';
import { specFor, AppBody, windowTitle } from './shell.jsx';

// Phones and tablets get a device of their own: a lock screen, a home screen
// with his photographs as the wallpaper, the widget and the icons, a dock,
// and apps that open full screen. Drawn here; no system artwork.

const DOCK = ['work', 'films', 'notes', 'contact'];
const SEEN = 'ln-unlocked';

function seenLock() {
  try {
    return sessionStorage.getItem(SEEN) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN, '1');
  } catch {
    /* private mode: the lock shows again next visit, which is fine */
  }
}

function useNow(every = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

// "6:10" whatever the locale's clock, without "AM/PM" crowding the big type.
function clockText(d) {
  return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' })
    .formatToParts(d)
    .filter((p) => p.type !== 'dayPeriod')
    .map((p) => p.value)
    .join('')
    .trim();
}

function ago(iso, now) {
  const mins = Math.max(0, Math.round((now - new Date(iso)) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// The wallpaper is one of his photographs, shown whole-screen. On a portrait
// screen a portrait cover is chosen, so less of it is cropped away.
function pickWallpaper(projects, portrait) {
  const withCover = projects.filter((p) => p.cover);
  const fits = withCover.find((p) => (p.cover.width < p.cover.height) === portrait);
  return fits || withCover[0] || null;
}

function useScreenShape() {
  const read = () => ({ ratio: window.innerWidth / window.innerHeight });
  const [shape, setShape] = useState(read);
  useEffect(() => {
    const on = () => setShape(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return shape;
}

function Wallpaper({ project, ratio }) {
  if (!project?.cover) return <div class="wall wall--plain" aria-hidden="true" />;
  return (
    <div class="wall" aria-hidden="true">
      <Picture photo={project.cover} sizes={croppedSizes(project.cover, ratio, [['', '100vw']])} eager priority />
    </div>
  );
}

export function DeviceOS({ mode, work, profile }) {
  const path = usePath();
  const spec = specFor(path);
  const [viewer, setViewer] = useState(null);
  // The lock screen greets a visit to the front page, once per visit. A link
  // straight to a project goes straight to the project.
  const [locked, setLocked] = useState(() => (path === '/' || path === '') && !seenLock());
  const { ratio } = useScreenShape();
  const projects = work.data?.projects || [];
  const wallpaper = pickWallpaper(projects, ratio < 1);

  useEffect(() => {
    const title = spec ? windowTitle(spec, work.data) : null;
    document.title = title ? `${title} — Lunga Ndaba` : 'Lunga Ndaba';
  }, [spec?.key, work.data]);

  const unlock = (to = '/') => {
    markSeen();
    setLocked(false);
    if (to !== '/') navigate(to);
  };

  if (locked) return <LockScreen wallpaper={wallpaper} ratio={ratio} name={profile?.displayName} onUnlock={unlock} />;

  return (
    <div class={`dev dev--${mode}`}>
      {spec ? (
        <AppScreen key={spec.key} spec={spec} title={windowTitle(spec, work.data)}>
          <AppBody win={spec} work={work} profile={profile} onView={setViewer} />
        </AppScreen>
      ) : (
        <HomeScreen
          mode={mode}
          projects={projects}
          wallpaper={wallpaper}
          ratio={ratio}
          profile={profile}
        />
      )}
      {viewer && <Viewer {...viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

// ── Lock screen ────────────────────────────────────────────────────────────
function LockScreen({ wallpaper, ratio, name, onUnlock }) {
  const now = useNow();
  const notes = useData('/notes').data?.notes || [];
  const start = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest?.('a, button:not(.lock__open)')) return;
        e.preventDefault();
        onUnlock('/');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      class="lock"
      onTouchStart={(e) => {
        start.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        const dy = e.changedTouches[0].clientY - (start.current ?? 0);
        if (dy < -60) onUnlock('/');
      }}
    >
      <Wallpaper project={wallpaper} ratio={ratio} />
      <div class="lock__shade" aria-hidden="true" />
      <header class="lock__clock">
        <p>{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <time>{clockText(now)}</time>
        <span class="lock__name">{name || 'Lunga Ndaba'}</span>
      </header>

      {notes.length > 0 && (
        <ul class="lock__notes" aria-label="Notes">
          {notes.slice(0, 3).map((n) => (
            <li key={n.id}>
              <button type="button" class="notif" onClick={() => onUnlock('/notes')}>
                <NotesIcon size={38} />
                <span class="notif__text">
                  <span class="notif__head">
                    <strong>Note from {n.name}</strong>
                    <small>{ago(n.createdAt, now)}</small>
                  </span>
                  <span class="notif__body">{n.message}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer class="lock__foot">
        {wallpaper && (
          <button type="button" class="lock__credit" onClick={() => onUnlock(`/work/${wallpaper.slug}`)}>
            From “{wallpaper.title}”
          </button>
        )}
        <button type="button" class="lock__open" onClick={() => onUnlock('/')}>
          <UpGlyph size={22} />
          <span>Swipe up to open</span>
        </button>
      </footer>
    </div>
  );
}

// ── Home screen ────────────────────────────────────────────────────────────
function HomeScreen({ mode, projects, wallpaper, ratio, profile }) {
  const now = useNow();
  const featured = projects.find((p) => p.cover) || null;
  const more = projects.filter((p) => p !== featured);
  const appIcon = (id) => APPS.find((a) => a.id === id);
  const tile = mode === 'tablet' ? 64 : 56;
  const drawn = Math.round((tile * 48) / 42);

  return (
    <div class="home-screen">
      <Wallpaper project={wallpaper} ratio={ratio} />
      <div class="home-screen__shade" aria-hidden="true" />
      <header class="statusbar">
        <span class="statusbar__name"><MarkIcon size={16} label="" /> {profile?.displayName || 'Lunga Ndaba'}</span>
        <time>{clockText(now)}</time>
      </header>

      <main class="springboard" aria-label="Home screen">
        {featured && (
          <a class="widget" href={`/work/${featured.slug}`} onClick={onLink}>
            <Picture
              photo={featured.cover}
              sizes={croppedSizes(featured.cover, 1, [['(min-width: 761px)', '320px'], ['', '46vw']])}
              eager
            />
            <span class="widget__label">
              <small>Latest work</small>
              <strong>{featured.title}</strong>
            </span>
          </a>
        )}
        {more.map((p, i) => (
          <a key={p.slug} class="icon" href={`/work/${p.slug}`} onClick={onLink}>
            <span class="icon__photo">
              {p.cover ? (
                <Picture photo={p.cover} sizes={croppedSizes(p.cover, 1, [['', `${tile}px`]])} eager={i < 8} />
              ) : (
                <span class="sleeve__empty" />
              )}
            </span>
            <span class="icon__label">{p.title}</span>
          </a>
        ))}
        <a class="icon" href="/about" onClick={onLink}>
          <span class="icon__glyph"><AboutIcon size={drawn} /></span>
          <span class="icon__label">About</span>
        </a>
        {profile?.instagram && (
          <a class="icon" href={`https://www.instagram.com/${profile.instagram}/`} target="_blank" rel="noopener noreferrer">
            <span class="icon__glyph"><OutboundCameraIcon size={drawn} /></span>
            <span class="icon__label">Instagram</span>
          </a>
        )}
        {!featured && !projects.length && <p class="springboard__empty">No work published yet.</p>}
      </main>

      <nav class="device-dock" aria-label="Apps">
        {DOCK.map((id) => {
          const { href, label, Icon } = appIcon(id);
          return (
            <a key={id} href={href} onClick={onLink} aria-label={label}>
              <Icon size={mode === 'tablet' ? 60 : 52} />
              {mode === 'tablet' && <span>{label}</span>}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

// ── An app, full screen ────────────────────────────────────────────────────
function AppScreen({ spec, title, children }) {
  const isProject = spec.app === 'project';
  const back = isProject ? '/work' : '/';
  return (
    <section class={`app app--${spec.app}`} aria-label={title}>
      <header class="app__bar">
        <a class="app__back" href={back} onClick={onLink}>
          <BackGlyph size={22} />
          <span>{isProject ? 'Work' : 'Home'}</span>
        </a>
        <h1 class="app__title">{title}</h1>
      </header>
      <div class="app__body">{children}</div>
      {/* The home bar: a tap anywhere on it goes back to the home screen. */}
      <a class="app__home" href="/" onClick={onLink} aria-label="Home screen">
        <span />
      </a>
    </section>
  );
}
