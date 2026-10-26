import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { navigate, usePath, onLink } from './router.js';
import { useData } from './api.js';
import { APPS, MarkIcon, OutboundCameraIcon, CloseGlyph, MaximiseGlyph, RestoreGlyph } from './icons.jsx';
import { Picture, croppedSizes } from './Picture.jsx';
import { Viewer } from './Viewer.jsx';
import { WorkIndex } from './apps/WorkIndex.jsx';
import { Project } from './apps/Project.jsx';
import { Films } from './apps/Films.jsx';
import { Notes } from './apps/Notes.jsx';
import { About } from './apps/About.jsx';
import { Contact } from './apps/Contact.jsx';

const MENU_H = 30;
const NARROW = '(max-width: 760px)';

function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

// What window an address opens. Every window has an address, so any view can
// be shared as a link.
function specFor(path) {
  const clean = path.replace(/\/+$/, '') || '/';
  const project = clean.match(/^\/work\/([a-z0-9-]+)$/);
  if (project) return { key: clean, app: 'project', slug: project[1] };
  const app = APPS.find((a) => a.href === clean);
  return app ? { key: app.href, app: app.id } : null;
}

const PARENT = (key) => (key.startsWith('/work/') ? '/work' : '/');

function area() {
  const w = window.innerWidth;
  // Leave room for the dock, so no window runs behind it.
  const h = window.innerHeight - MENU_H - 104;
  return { w, h };
}

// Where a new window lands on a wide screen. Work windows are big on purpose:
// they hold photographs.
function placeFor(spec, count) {
  const { w: aw, h: ah } = area();
  const step = (count % 6) * 26;
  const right = aw >= 1100 ? 150 : 24;
  if (spec.app === 'work' || spec.app === 'films') {
    const w = Math.min(1180, aw - 32 - right);
    return { x: 32 + step, y: 18 + step, w, h: Math.max(360, ah - 18 - step) };
  }
  if (spec.app === 'project') {
    const w = Math.min(1280, aw - 48 - right);
    return { x: 24 + step, y: 10 + step, w, h: Math.max(360, ah - 10 - step) };
  }
  const w = Math.min(600, aw - 48);
  return { x: Math.max(24, (aw - w) / 2 + step), y: 36 + step, w, h: Math.min(720, ah - 48) };
}

export function Desktop() {
  const path = usePath();
  const narrow = useMedia(NARROW);
  const [wins, setWins] = useState([]);
  const [viewer, setViewer] = useState(null);
  const z = useRef(1);
  const first = useRef(true);
  const work = useData('/work');
  const profile = useData('/profile').data;

  // Follow the address: open (or bring forward) the window it names.
  useEffect(() => {
    const spec = specFor(path);
    // The very first visit to "/" opens Work, so photographs come first.
    if (!spec && path === '/' && first.current) {
      first.current = false;
      navigate('/work', { replace: true });
      return;
    }
    first.current = false;
    if (!spec) return;
    setWins((list) => {
      const open = list.find((w) => w.key === spec.key);
      z.current += 1;
      if (open) return list.map((w) => (w.key === spec.key ? { ...w, z: z.current } : w));
      return [...list, { ...spec, ...placeFor(spec, list.length), z: z.current, max: false }];
    });
  }, [path]);

  const top = wins.reduce((a, b) => (!a || b.z > a.z ? b : a), null);

  useEffect(() => {
    const title = top ? windowTitle(top, work.data) : null;
    document.title = title ? `${title} — Lunga Ndaba` : 'Lunga Ndaba';
  }, [top?.key, work.data]);

  const focus = useCallback((key) => {
    if (top?.key !== key) navigate(key);
  }, [top?.key]);

  const close = (key) => {
    const rest = wins.filter((w) => w.key !== key);
    setWins(rest);
    if (narrow) {
      navigate(PARENT(key));
    } else {
      const next = rest.reduce((a, b) => (!a || b.z > a.z ? b : a), null);
      navigate(next ? next.key : '/', { replace: true });
    }
  };

  const update = useCallback((key, patch) => {
    setWins((list) => list.map((w) => (w.key === key ? { ...w, ...patch } : w)));
  }, []);

  // On a phone, one window at a time: the one the address names.
  const current = specFor(path)?.key;
  const shown = narrow ? wins.filter((w) => w.key === current) : wins;
  const openKeys = new Set(wins.map((w) => w.key));
  const projects = work.data?.projects || [];

  return (
    <div class={`os ${narrow ? 'os--narrow' : ''}`}>
      <MenuBar narrow={narrow} name={profile?.displayName} />
      <main class="desk" aria-label="Desktop">
        {!narrow && projects.length > 0 && (
          <nav class="desk__icons" aria-label="Projects">
            {projects.slice(0, 7).map((p) => (
              <a key={p.slug} href={`/work/${p.slug}`} onClick={onLink} class="sleeve">
                <span class="sleeve__frame">
                  {p.cover ? <Picture photo={p.cover} sizes={croppedSizes(p.cover, 78 / 56, [['', '78px']])} /> : <span class="sleeve__empty" />}
                </span>
                <span class="sleeve__label">{p.title}</span>
              </a>
            ))}
          </nav>
        )}
        {narrow && shown.length === 0 && <HomeScreen projects={projects} />}
        {shown.map((w) => (
          <Window
            key={w.key}
            win={w}
            narrow={narrow}
            active={w.key === top?.key}
            title={windowTitle(w, work.data)}
            onFocus={() => focus(w.key)}
            onClose={() => close(w.key)}
            onChange={(patch) => update(w.key, patch)}
          >
            <AppBody win={w} work={work} profile={profile} onView={setViewer} />
          </Window>
        ))}
      </main>
      <Dock openKeys={openKeys} current={top?.key} instagram={profile?.instagram} narrow={narrow} />
      {viewer && <Viewer {...viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

function windowTitle(w, work) {
  if (w.app === 'project') return work?.projects?.find((p) => p.slug === w.slug)?.title || 'Project';
  return APPS.find((a) => a.id === w.app)?.label || '';
}

function AppBody({ win, work, profile, onView }) {
  switch (win.app) {
    case 'work':
      return <WorkIndex state={work} />;
    case 'project':
      return <Project slug={win.slug} onView={onView} />;
    case 'films':
      return <Films />;
    case 'notes':
      return <Notes />;
    case 'about':
      return <About profile={profile} />;
    case 'contact':
      return <Contact profile={profile} />;
    default:
      return null;
  }
}

function MenuBar({ narrow, name }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const day = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <header class="menubar">
      <a href="/about" onClick={onLink} class="menubar__mark" aria-label="About">
        <MarkIcon size={18} label="" />
      </a>
      <a href="/work" onClick={onLink} class="menubar__name">{name || 'Lunga Ndaba'}</a>
      {!narrow && (
        <nav class="menubar__menu" aria-label="Main">
          {APPS.map((a) => (
            <a key={a.id} href={a.href} onClick={onLink}>{a.label}</a>
          ))}
        </nav>
      )}
      <span class="menubar__clock">
        {!narrow && <span>{day}</span>}
        <time>{time}</time>
      </span>
    </header>
  );
}

function Dock({ openKeys, current, instagram, narrow }) {
  const isOpen = (href) => [...openKeys].some((k) => k === href || k.startsWith(`${href}/`));
  return (
    <nav class="dock" aria-label="Apps">
      <div class="dock__shelf">
        {APPS.map(({ id, href, label, Icon }) => (
          <a
            key={id}
            href={href}
            onClick={onLink}
            class={`dock__app ${isOpen(href) ? 'is-open' : ''}`}
            aria-current={current === href ? 'page' : undefined}
          >
            <Icon size={narrow ? 40 : 50} />
            <span class="dock__label">{label}</span>
          </a>
        ))}
        {instagram && (
          <>
            <span class="dock__divider" aria-hidden="true" />
            <a class="dock__app" href={`https://www.instagram.com/${instagram}/`} target="_blank" rel="noopener noreferrer">
              <OutboundCameraIcon size={narrow ? 40 : 50} />
              <span class="dock__label">Instagram</span>
            </a>
          </>
        )}
      </div>
    </nav>
  );
}

// On a phone with every window closed: the projects, as big covers.
function HomeScreen({ projects }) {
  return (
    <div class="home">
      {projects.map((p, i) => (
        <a key={p.slug} href={`/work/${p.slug}`} onClick={onLink} class="home__item">
          {p.cover ? <Picture photo={p.cover} sizes={croppedSizes(p.cover, 0.8, [['', '50vw']])} eager={i < 4} /> : <span class="sleeve__empty" />}
          <span>{p.title}</span>
        </a>
      ))}
    </div>
  );
}

function Window({ win, narrow, active, title, onFocus, onClose, onChange, children }) {
  const drag = useRef(null);
  const body = useRef(null);

  useEffect(() => {
    if (active && narrow) body.current?.scrollTo?.(0, 0);
  }, [win.key, narrow]);

  const startDrag = (e) => {
    if (narrow || win.max || e.button !== 0 || e.target.closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
  };
  const moveDrag = (e) => {
    if (!drag.current) return;
    const { w: aw, h: ah } = area();
    const x = Math.min(Math.max(e.clientX - drag.current.dx, 120 - win.w), aw - 120);
    const y = Math.min(Math.max(e.clientY - drag.current.dy, 0), ah + 40);
    onChange({ x, y });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const style = narrow || win.max ? { zIndex: win.z } : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <section
      class={`win win--${win.app} ${active ? 'is-active' : ''} ${win.max ? 'is-max' : ''}`}
      style={style}
      aria-label={title}
      onPointerDown={active ? undefined : onFocus}
    >
      <div
        class="win__bar"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDblClick={() => !narrow && onChange({ max: !win.max })}
      >
        <h2 class="win__title">{title}</h2>
        <div class="win__buttons">
          {!narrow && (
            <button type="button" class="win__btn" onClick={() => onChange({ max: !win.max })} aria-label={win.max ? 'Restore' : 'Fill the screen'}>
              {win.max ? <RestoreGlyph size={16} /> : <MaximiseGlyph size={16} />}
            </button>
          )}
          <button type="button" class="win__btn" onClick={onClose} aria-label={`Close ${title}`}>
            <CloseGlyph size={narrow ? 20 : 16} />
          </button>
        </div>
      </div>
      <div class="win__body" ref={body}>{children}</div>
    </section>
  );
}
