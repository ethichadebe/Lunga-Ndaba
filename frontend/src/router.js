import { useEffect, useState } from 'preact/hooks';

// A tiny router over the History API. Links call navigate(); back/forward work.
const listeners = new Set();

export function navigate(to, { replace = false } = {}) {
  if (to === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState']({}, '', to);
  listeners.forEach((fn) => fn(location.pathname));
}

export function usePath() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    listeners.add(setPath);
    window.addEventListener('popstate', on);
    return () => {
      listeners.delete(setPath);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return path;
}

// For <a href> inside the app: plain clicks route in place, modified clicks
// (new tab, etc.) behave like normal links.
export function onLink(e) {
  const a = e.currentTarget;
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target || a.origin !== location.origin) return;
  e.preventDefault();
  navigate(a.pathname);
}
