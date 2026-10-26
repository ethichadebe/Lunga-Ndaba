import { useEffect, useState } from 'preact/hooks';

const cache = new Map();

export async function api(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    credentials: 'same-origin',
    headers: body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : undefined,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Something went wrong (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Public reads are cached for the page's life, so reopening a window is instant.
export function getCached(path) {
  if (!cache.has(path)) {
    const p = api(path).catch((e) => {
      cache.delete(path);
      throw e;
    });
    cache.set(path, p);
  }
  return cache.get(path);
}

export function useData(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    if (!path) return undefined;
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    getCached(path).then(
      (data) => live && setState({ data, error: null, loading: false }),
      (error) => live && setState({ data: null, error, loading: false }),
    );
    return () => {
      live = false;
    };
  }, [path]);
  return state;
}

export const forget = (path) => cache.delete(path);
