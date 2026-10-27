import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { api } from '../api.js';
import { navigate, usePath, onLink } from '../router.js';
import { Picture, croppedSizes } from '../Picture.jsx';
import {
  MarkIcon, WorkIcon, NotesIcon, AboutIcon, BackGlyph, UpGlyph, DownGlyph, UploadGlyph, DownloadGlyph,
  TrashGlyph, StarGlyph, EyeGlyph, PlusGlyph, CloseGlyph, CheckGlyph, LinkGlyph, RetryGlyph, FilmsIcon,
} from '../icons.jsx';
import './admin.css';

// Lunga's side of the site. Built for his phone: plain words, big buttons,
// nothing that needs a developer.
export default function Admin() {
  const [me, setMe] = useState(null);
  const refresh = useCallback(() => api('/admin/me').then(setMe).catch(() => setMe({ signedIn: false })), []);
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    document.title = 'Admin — Lunga Ndaba';
  }, []);
  if (!me) return <div class="admin-loading" />;
  if (!me.signedIn) return <Login onDone={refresh} />;
  return <Shell uploadsReady={me.uploadsReady} onSignOut={() => setMe({ signedIn: false })} />;
}

function Login({ onDone }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/admin/login', { method: 'POST', body: { password: new FormData(e.currentTarget).get('password') } });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div class="ad ad--login">
      <form class="ad-card ad-login" onSubmit={submit}>
        <MarkIcon size={44} />
        <h1>Sign in</h1>
        <label class="ad-field">
          <span>Password</span>
          <input type="password" name="password" autoComplete="current-password" required autoFocus />
        </label>
        {error && <p class="ad-error" role="alert">{error}</p>}
        <button class="ad-btn ad-btn--primary ad-btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

function Shell({ uploadsReady, onSignOut }) {
  const path = usePath();
  const [pending, setPending] = useState(0);
  useEffect(() => {
    api('/admin/notes?status=pending').then((d) => setPending(d.pending)).catch(() => {});
  }, [path]);

  const projectMatch = path.match(/^\/admin\/work\/([^/]+)$/);
  let screen;
  if (projectMatch) screen = <ProjectEditor id={projectMatch[1]} uploadsReady={uploadsReady} />;
  else if (path === '/admin/notes') screen = <NotesInbox onCount={setPending} />;
  else if (path === '/admin/about') screen = <ProfileForm onSignOut={onSignOut} />;
  else screen = <WorkList />;

  const tab = path.startsWith('/admin/notes') ? 'notes' : path.startsWith('/admin/about') ? 'about' : 'work';
  return (
    <div class="ad">
      {!uploadsReady && (
        <p class="ad-banner" role="alert">
          Photo uploads are switched off: the server's photo folder isn't connected to permanent storage. Nothing you upload would be safe, so nothing is accepted until it is fixed.
        </p>
      )}
      <main class="ad-main">{screen}</main>
      <nav class="ad-tabs" aria-label="Admin">
        <a href="/admin" onClick={onLink} class={tab === 'work' ? 'is-on' : ''}><WorkIcon size={30} /><span>Work</span></a>
        <a href="/admin/notes" onClick={onLink} class={tab === 'notes' ? 'is-on' : ''}>
          <NotesIcon size={30} />
          <span>Notes</span>
          {pending > 0 && <b class="ad-badge">{pending}</b>}
        </a>
        <a href="/admin/about" onClick={onLink} class={tab === 'about' ? 'is-on' : ''}><AboutIcon size={30} /><span>About me</span></a>
        <a href="/" class="ad-tabs__site"><LinkGlyph size={22} /><span>View site</span></a>
      </nav>
    </div>
  );
}

function TopBar({ title, back, children }) {
  return (
    <header class="ad-top">
      {back && (
        <a href={back} onClick={onLink} class="ad-icon-btn" aria-label="Back"><BackGlyph size={24} /></a>
      )}
      <h1>{title}</h1>
      <div class="ad-top__actions">{children}</div>
    </header>
  );
}

function useToast() {
  const [msg, setMsg] = useState(null);
  const t = useRef(null);
  const show = (m) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2600);
  };
  const node = msg ? <div class={`ad-toast ${msg.error ? 'is-error' : ''}`} role="status">{msg.text}</div> : null;
  return [node, (text) => show({ text }), (text) => show({ text, error: true })];
}

// ── Work ───────────────────────────────────────────────────────────────────
function WorkList() {
  const [projects, setProjects] = useState(null);
  const [creating, setCreating] = useState(false);
  const [toast, ok, fail] = useToast();
  const load = () => api('/admin/projects').then((d) => setProjects(d.projects)).catch((e) => fail(e.message));
  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    const title = new FormData(e.currentTarget).get('title');
    try {
      const { id } = await api('/admin/projects', { method: 'POST', body: { title } });
      navigate(`/admin/work/${id}`);
    } catch (err) {
      fail(err.message);
    }
  }

  async function move(id, direction) {
    await api(`/admin/projects/${id}/move`, { method: 'POST', body: { direction } }).catch((e) => fail(e.message));
    load();
  }

  return (
    <>
      <TopBar title="Your work">
        <button class="ad-btn ad-btn--primary" onClick={() => setCreating(true)}><PlusGlyph size={18} /> New project</button>
      </TopBar>
      {creating && (
        <form class="ad-card ad-stack" onSubmit={create}>
          <label class="ad-field">
            <span>What is this project called?</span>
            <input name="title" required maxLength={120} autoFocus placeholder="For example, the name of the shoot" />
          </label>
          <div class="ad-row">
            <button type="button" class="ad-btn" onClick={() => setCreating(false)}>Cancel</button>
            <button class="ad-btn ad-btn--primary">Create</button>
          </div>
        </form>
      )}
      {projects && projects.length === 0 && !creating && (
        <div class="ad-empty">
          <WorkIcon size={56} />
          <p>No projects yet. A project is one shoot or one body of work: make one, then add its photos.</p>
        </div>
      )}
      <ul class="ad-list">
        {(projects || []).map((p, i) => (
          <li key={p.id} class="ad-card ad-project">
            <a href={`/admin/work/${p.id}`} onClick={onLink} class="ad-project__main">
              <span class="ad-thumb">{p.cover ? <Picture photo={p.cover} sizes={croppedSizes(p.cover, 1, [['', '64px']])} /> : <WorkIcon size={40} />}</span>
              <span class="ad-project__text">
                <strong>{p.title}</strong>
                <small>
                  {p.photoCount} photo{p.photoCount === 1 ? '' : 's'}
                  {p.videoCount ? ` · ${p.videoCount} film${p.videoCount === 1 ? '' : 's'}` : ''}
                  {p.processing ? ` · preparing ${p.processing}` : ''}
                </small>
                <span class={`ad-pill ${p.published ? 'is-live' : ''}`}>{p.published ? 'Live' : 'Hidden'}</span>
              </span>
            </a>
            <span class="ad-order">
              <button class="ad-icon-btn" aria-label={`Move ${p.title} up`} disabled={i === 0} onClick={() => move(p.id, 'up')}><UpGlyph /></button>
              <button class="ad-icon-btn" aria-label={`Move ${p.title} down`} disabled={i === projects.length - 1} onClick={() => move(p.id, 'down')}><DownGlyph /></button>
            </span>
          </li>
        ))}
      </ul>
      {toast}
    </>
  );
}

// Sends one file at a time, with progress, so a stall costs one photo, not the lot.
function sendFile(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body?.error || (xhr.status === 413 ? 'That photo is too large.' : 'The upload did not work.')));
    };
    xhr.onerror = () => reject(new Error('The connection dropped. Try again when you have signal.'));
    const form = new FormData();
    form.append('file', file, file.name);
    xhr.send(form);
  });
}

function ProjectEditor({ id, uploadsReady }) {
  const [project, setProject] = useState(null);
  const [draft, setDraft] = useState(null);
  const [queue, setQueue] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [toast, ok, fail] = useToast();
  const fileInput = useRef(null);
  const running = useRef(false);

  const load = useCallback(async () => {
    try {
      const p = await api(`/admin/projects/${id}`);
      setProject(p);
      setDraft((d) => d || { title: p.title, summary: p.summary, dateLabel: p.dateLabel, location: p.location });
      return p;
    } catch (e) {
      fail(e.message);
      return null;
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [id]);

  // While photos are being prepared, check back every few seconds.
  const preparing = project?.photos.some((p) => p.status === 'processing');
  useEffect(() => {
    if (!preparing) return undefined;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [preparing, load]);

  async function runQueue(items) {
    if (running.current) return;
    running.current = true;
    for (const item of items) {
      setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, state: 'sending' } : x)));
      try {
        await sendFile(`/api/admin/projects/${id}/photos`, item.file, (progress) =>
          setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, progress } : x))),
        );
        setQueue((q) => q.filter((x) => x.key !== item.key));
        load();
      } catch (err) {
        setQueue((q) => q.map((x) => (x.key === item.key ? { ...x, state: 'error', error: err.message } : x)));
      }
    }
    running.current = false;
  }

  function addFiles(e) {
    const files = [...(e.currentTarget.files || [])];
    e.currentTarget.value = '';
    if (!files.length) return;
    const items = files.map((file, n) => ({ key: `${Date.now()}-${n}`, file, progress: 0, state: 'waiting' }));
    setQueue((q) => [...q, ...items]);
    runQueue(items);
  }

  const dirty = project && draft && ['title', 'summary', 'dateLabel', 'location'].some((k) => (draft[k] || '') !== (project[k] || ''));

  async function save(patch, message = 'Saved') {
    try {
      const p = await api(`/admin/projects/${id}`, { method: 'PATCH', body: patch });
      setProject(p);
      ok(message);
    } catch (err) {
      fail(err.message);
    }
  }

  async function remove() {
    if (!confirm(`Delete “${project.title}” and its ${project.photos.length} photo(s) from the site? The original files are kept safely on the server.`)) return;
    try {
      await api(`/admin/projects/${id}`, { method: 'DELETE' });
      navigate('/admin');
    } catch (err) {
      fail(err.message);
    }
  }

  if (!project || !draft) return <><TopBar title="Project" back="/admin" />{toast}</>;
  const bind = (k) => ({ value: draft[k] || '', onInput: (e) => setDraft({ ...draft, [k]: e.currentTarget.value }) });

  return (
    <>
      <TopBar title={project.title} back="/admin">
        {project.published && (
          <a class="ad-icon-btn" href={`/work/${project.slug}`} target="_blank" rel="noopener" aria-label="See it on the site"><EyeGlyph /></a>
        )}
      </TopBar>

      <section class="ad-card ad-live">
        <div>
          <strong>{project.published ? 'Live on the site' : 'Hidden from the site'}</strong>
          <small>{project.published ? 'Anyone can see this project.' : 'Only you can see it, here.'}</small>
        </div>
        <button
          role="switch"
          aria-checked={project.published}
          class={`ad-switch ${project.published ? 'is-on' : ''}`}
          onClick={() => save({ published: !project.published }, project.published ? 'Hidden' : 'Now live')}
        >
          <span />
          <b class="ad-sr">Show on the site</b>
        </button>
      </section>

      <section class="ad-section">
        <div class="ad-section__head">
          <h2>Photos</h2>
          <button class="ad-btn ad-btn--primary" disabled={!uploadsReady} onClick={() => fileInput.current.click()}>
            <UploadGlyph size={18} /> Add photos
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/tiff"
            multiple
            hidden
            onChange={addFiles}
          />
        </div>
        {queue.length > 0 && (
          <ul class="ad-queue">
            {queue.map((q) => (
              <li key={q.key} class={q.state === 'error' ? 'is-error' : ''}>
                <span class="ad-queue__name">{q.file.name}</span>
                {q.state === 'error' ? (
                  <span class="ad-queue__err">
                    {q.error}
                    <button class="ad-link" onClick={() => setQueue((x) => x.filter((y) => y.key !== q.key))}>Dismiss</button>
                  </span>
                ) : (
                  <progress max="1" value={q.state === 'waiting' ? 0 : q.progress} aria-label={`Uploading ${q.file.name}`} />
                )}
              </li>
            ))}
          </ul>
        )}
        {project.photos.length === 0 && queue.length === 0 ? (
          <p class="ad-hint">Add photos straight from your phone. The full-size files are kept exactly as you send them; the site makes smaller copies for viewing.</p>
        ) : (
          <ul class="ad-grid">
            {project.photos.map((p) => (
              <li key={p.id}>
                <button class="ad-grid__item" onClick={() => setSheet(p.id)} aria-label={`Photo ${p.originalName}`}>
                  {p.status === 'ready' ? <Picture photo={p} sizes={croppedSizes(p, 1, [['(min-width: 560px)', '170px'], ['', '34vw']])} /> : <span class="ad-grid__blank" />}
                  {p.status === 'processing' && <span class="ad-grid__state">Preparing…</span>}
                  {p.status === 'failed' && <span class="ad-grid__state is-error">Couldn't prepare</span>}
                  {project.coverPhotoId === p.id && <span class="ad-grid__cover"><StarGlyph filled size={16} /></span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section class="ad-card ad-stack">
        <h2>About this project</h2>
        <label class="ad-field"><span>Name</span><input maxLength={120} {...bind('title')} /></label>
        <label class="ad-field"><span>A few words <em>(optional)</em></span><textarea rows={4} maxLength={2000} {...bind('summary')} /></label>
        <div class="ad-two">
          <label class="ad-field"><span>When <em>(optional)</em></span><input maxLength={80} placeholder="e.g. March 2025" {...bind('dateLabel')} /></label>
          <label class="ad-field"><span>Where <em>(optional)</em></span><input maxLength={120} {...bind('location')} /></label>
        </div>
        <button class="ad-btn ad-btn--primary" disabled={!dirty} onClick={() => save(draft)}>
          <CheckGlyph size={18} /> Save
        </button>
      </section>

      <FilmsEditor project={project} onChange={load} ok={ok} fail={fail} />

      <section class="ad-danger">
        <button class="ad-btn ad-btn--danger" onClick={remove}><TrashGlyph size={18} /> Delete this project</button>
      </section>

      {sheet && (
        <PhotoSheet
          photo={project.photos.find((p) => p.id === sheet)}
          index={project.photos.findIndex((p) => p.id === sheet)}
          count={project.photos.length}
          isCover={project.coverPhotoId === sheet}
          onCover={() => save({ coverPhotoId: sheet }, 'Cover set')}
          onClose={() => setSheet(null)}
          onChange={load}
          ok={ok}
          fail={fail}
        />
      )}
      {toast}
    </>
  );
}

function PhotoSheet({ photo, index, count, isCover, onCover, onClose, onChange, ok, fail }) {
  const [alt, setAlt] = useState(photo?.alt || '');
  const [caption, setCaption] = useState(photo?.caption || '');
  if (!photo) return null;

  const act = async (fn, message) => {
    try {
      await fn();
      if (message) ok(message);
      await onChange();
    } catch (err) {
      fail(err.message);
    }
  };
  const move = (direction) => act(() => api(`/admin/photos/${photo.id}/move`, { method: 'POST', body: { direction } }));
  const saveText = () => act(() => api(`/admin/photos/${photo.id}`, { method: 'PATCH', body: { alt, caption } }), 'Saved');
  const remove = () => {
    if (!confirm('Remove this photo from the site? The original file is kept safely on the server.')) return;
    act(() => api(`/admin/photos/${photo.id}`, { method: 'DELETE' }), 'Removed').then(onClose);
  };
  const mb = (photo.bytes / 1024 / 1024).toFixed(1);

  return (
    <div class="ad-sheet" role="dialog" aria-modal="true" aria-label="Photo" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="ad-sheet__panel">
        <div class="ad-sheet__head">
          <span>Photo {index + 1} of {count}</span>
          <button class="ad-icon-btn" onClick={onClose} aria-label="Close"><CloseGlyph /></button>
        </div>
        <div class="ad-sheet__preview">
          {photo.status === 'ready' ? <Picture photo={photo} fit="contain" sizes="90vw" eager /> : <span class="ad-grid__blank" />}
        </div>
        <p class="ad-meta">{photo.originalName} · {photo.width} × {photo.height} · {mb} MB</p>
        {photo.status === 'failed' && (
          <p class="ad-error">{photo.error || 'This photo could not be prepared.'}{' '}
            <button class="ad-link" onClick={() => act(() => api(`/admin/photos/${photo.id}/retry`, { method: 'POST' }), 'Trying again')}><RetryGlyph size={16} /> Try again</button>
          </p>
        )}
        <div class="ad-actions">
          <button class="ad-btn" disabled={isCover || photo.status !== 'ready'} onClick={onCover}><StarGlyph filled={isCover} size={18} /> {isCover ? 'Cover photo' : 'Make cover'}</button>
          <button class="ad-btn" disabled={index === 0} onClick={() => move('up')}><BackGlyph size={18} /> Earlier</button>
          <button class="ad-btn" disabled={index === count - 1} onClick={() => move('down')}>Later <span class="ad-flip"><BackGlyph size={18} /></span></button>
          <a class="ad-btn" href={`/api/admin/photos/${photo.id}/original`} download={photo.originalName}><DownloadGlyph size={18} /> Original</a>
        </div>
        <label class="ad-field">
          <span>Describe the photo <em>(for people who can't see it)</em></span>
          <input value={alt} maxLength={300} onInput={(e) => setAlt(e.currentTarget.value)} />
        </label>
        <label class="ad-field">
          <span>Caption <em>(optional, shown under the photo)</em></span>
          <input value={caption} maxLength={500} onInput={(e) => setCaption(e.currentTarget.value)} />
        </label>
        <div class="ad-row">
          <button class="ad-btn ad-btn--danger-quiet" onClick={remove}><TrashGlyph size={18} /> Remove</button>
          <button class="ad-btn ad-btn--primary" onClick={saveText}><CheckGlyph size={18} /> Save</button>
        </div>
      </div>
    </div>
  );
}

function FilmsEditor({ project, onChange, ok, fail }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api(`/admin/projects/${project.id}/videos`, {
        method: 'POST',
        body: { url: f.get('url'), title: f.get('title'), shape: f.get('shape') },
      });
      setAdding(false);
      ok('Film added');
      onChange();
    } catch (err) {
      fail(err.message);
    } finally {
      setBusy(false);
    }
  }
  const act = (fn) => fn().then(onChange).catch((err) => fail(err.message));
  return (
    <section class="ad-section">
      <div class="ad-section__head">
        <h2>Films</h2>
        {!adding && <button class="ad-btn" onClick={() => setAdding(true)}><PlusGlyph size={18} /> Add a film</button>}
      </div>
      {adding && (
        <form class="ad-card ad-stack" onSubmit={add}>
          <label class="ad-field">
            <span>Link from YouTube or Vimeo</span>
            <input name="url" type="url" required inputMode="url" placeholder="Paste the link here" autoFocus />
          </label>
          <label class="ad-field"><span>Title <em>(optional)</em></span><input name="title" maxLength={160} /></label>
          <fieldset class="ad-choice">
            <legend>Shape</legend>
            <label><input type="radio" name="shape" value="" defaultChecked /> Work it out</label>
            <label><input type="radio" name="shape" value="landscape" /> Wide</label>
            <label><input type="radio" name="shape" value="vertical" /> Tall</label>
            <label><input type="radio" name="shape" value="square" /> Square</label>
          </fieldset>
          <div class="ad-row">
            <button type="button" class="ad-btn" onClick={() => setAdding(false)}>Cancel</button>
            <button class="ad-btn ad-btn--primary" disabled={busy}>{busy ? 'Adding…' : 'Add film'}</button>
          </div>
        </form>
      )}
      {project.videos.length === 0 && !adding && <p class="ad-hint">Films play from YouTube or Vimeo; paste a link and the site shows it in its own frame.</p>}
      <ul class="ad-list">
        {project.videos.map((v, i) => (
          <li key={v.id} class="ad-card ad-film">
            <span class="ad-thumb ad-thumb--wide">{v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" loading="lazy" /> : <FilmsIcon size={36} />}</span>
            <span class="ad-project__text">
              <strong>{v.title || 'Untitled film'}</strong>
              <small>{v.provider === 'youtube' ? 'YouTube' : 'Vimeo'} · {v.shape === 'vertical' ? 'Tall' : v.shape === 'square' ? 'Square' : 'Wide'}</small>
            </span>
            <span class="ad-order">
              <button class="ad-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => act(() => api(`/admin/videos/${v.id}/move`, { method: 'POST', body: { direction: 'up' } }))}><UpGlyph /></button>
              <button class="ad-icon-btn" aria-label="Remove film" onClick={() => confirm('Remove this film from the project?') && act(() => api(`/admin/videos/${v.id}`, { method: 'DELETE' }))}><TrashGlyph /></button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Notes ──────────────────────────────────────────────────────────────────
function NotesInbox({ onCount }) {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [toast, ok, fail] = useToast();
  const load = () =>
    api(`/admin/notes?status=${tab}`)
      .then((d) => {
        setData(d);
        onCount(d.pending);
      })
      .catch((e) => fail(e.message));
  useEffect(() => {
    load();
  }, [tab]);

  const act = async (fn, message) => {
    try {
      await fn();
      ok(message);
      load();
    } catch (err) {
      fail(err.message);
    }
  };

  return (
    <>
      <TopBar title="Notes" />
      <div class="ad-seg" role="tablist">
        <button role="tab" aria-selected={tab === 'pending'} class={tab === 'pending' ? 'is-on' : ''} onClick={() => setTab('pending')}>
          Waiting{data?.pending ? ` (${data.pending})` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'approved'} class={tab === 'approved' ? 'is-on' : ''} onClick={() => setTab('approved')}>
          On the site
        </button>
      </div>
      {data && data.notes.length === 0 && (
        <p class="ad-hint">{tab === 'pending' ? 'No notes waiting. New notes land here, and stay hidden until you approve them.' : 'No notes on the site yet.'}</p>
      )}
      <ul class="ad-list">
        {(data?.notes || []).map((n) => (
          <li key={n.id} class="ad-card ad-note">
            <p>{n.message}</p>
            <small>
              <strong>{n.name}</strong>
              {n.relation ? ` · ${n.relation}` : ''} · {new Date(n.createdAt).toLocaleDateString()}
            </small>
            <div class="ad-row">
              <button class="ad-btn ad-btn--danger-quiet" onClick={() => confirm('Delete this note for good?') && act(() => api(`/admin/notes/${n.id}`, { method: 'DELETE' }), 'Deleted')}>
                <TrashGlyph size={18} /> Delete
              </button>
              {n.status === 'pending' ? (
                <button class="ad-btn ad-btn--primary" onClick={() => act(() => api(`/admin/notes/${n.id}/approve`, { method: 'POST' }), 'Now on the site')}>
                  <CheckGlyph size={18} /> Approve
                </button>
              ) : (
                <button class="ad-btn" onClick={() => act(() => api(`/admin/notes/${n.id}/hide`, { method: 'POST' }), 'Hidden')}>Hide</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {toast}
    </>
  );
}

// ── About me ───────────────────────────────────────────────────────────────
function ProfileForm({ onSignOut }) {
  const [p, setP] = useState(null);
  const [toast, ok, fail] = useToast();
  useEffect(() => {
    api('/admin/profile').then(setP).catch((e) => fail(e.message));
  }, []);
  async function save(e) {
    e.preventDefault();
    try {
      await api('/admin/profile', { method: 'PUT', body: p });
      ok('Saved');
    } catch (err) {
      fail(err.message);
    }
  }
  async function signOut() {
    await api('/admin/logout', { method: 'POST' }).catch(() => {});
    onSignOut();
  }
  if (!p) return <><TopBar title="About me" />{toast}</>;
  const bind = (k) => ({ value: p[k], onInput: (e) => setP({ ...p, [k]: e.currentTarget.value }) });
  return (
    <>
      <TopBar title="About me" />
      <form class="ad-card ad-stack" onSubmit={save}>
        <label class="ad-field"><span>Name as shown on the site</span><input maxLength={120} placeholder="Lunga Ndaba" {...bind('displayName')} /></label>
        <label class="ad-field"><span>One line about your work</span><input maxLength={300} {...bind('intro')} /></label>
        <label class="ad-field"><span>Bio <em>(leave an empty line between paragraphs)</em></span><textarea rows={8} maxLength={5000} {...bind('bio')} /></label>
        <label class="ad-field"><span>Email for enquiries</span><input type="email" inputMode="email" maxLength={200} {...bind('email')} /></label>
        <label class="ad-field"><span>Instagram name</span><input maxLength={60} placeholder="without the @" autoCapitalize="off" {...bind('instagram')} /></label>
        <label class="ad-field"><span>Where you are based <em>(optional)</em></span><input maxLength={120} {...bind('location')} /></label>
        <button class="ad-btn ad-btn--primary"><CheckGlyph size={18} /> Save</button>
      </form>
      <section class="ad-danger">
        <button class="ad-btn" onClick={signOut}>Sign out</button>
      </section>
      {toast}
    </>
  );
}
