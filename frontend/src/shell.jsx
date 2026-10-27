import { useEffect, useState } from 'preact/hooks';
import { APPS } from './icons.jsx';
import { WorkIndex } from './apps/WorkIndex.jsx';
import { Project } from './apps/Project.jsx';
import { Films } from './apps/Films.jsx';
import { Notes } from './apps/Notes.jsx';
import { About } from './apps/About.jsx';
import { Contact } from './apps/Contact.jsx';

// Shared by the desktop and the phone/tablet device.

export function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

// What an address opens. Every view has an address, so it can be shared.
export function specFor(path) {
  const clean = path.replace(/\/+$/, '') || '/';
  const project = clean.match(/^\/work\/([a-z0-9-]+)$/);
  if (project) return { key: clean, app: 'project', slug: project[1] };
  const app = APPS.find((a) => a.href === clean);
  return app ? { key: app.href, app: app.id } : null;
}

export function windowTitle(w, work) {
  if (w.app === 'project') return work?.projects?.find((p) => p.slug === w.slug)?.title || 'Project';
  return APPS.find((a) => a.id === w.app)?.label || '';
}

export function AppBody({ win, work, profile, onView }) {
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
