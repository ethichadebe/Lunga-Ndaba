import { useState } from 'preact/hooks';
import { api, useData, forget } from '../api.js';

// Anyone can leave a note. Nothing shows here until Lunga approves it.
export function Notes() {
  const { data } = useData('/notes');
  const notes = data?.notes || [];
  return (
    <div class="pane pane--notes">
      <NoteForm />
      <section aria-label="Notes" class="notes">
        {notes.length === 0 && data && <p class="quiet">No notes yet.</p>}
        {notes.map((n, i) => (
          <figure key={n.id} class="note" style={{ '--tilt': `${((i * 37) % 5) - 2}deg` }}>
            <blockquote>{n.message}</blockquote>
            <figcaption>
              <strong>{n.name}</strong>
              {n.relation && <span>{n.relation}</span>}
            </figcaption>
          </figure>
        ))}
      </section>
    </div>
  );
}

function NoteForm() {
  const [startedAt] = useState(() => Date.now());
  const [state, setState] = useState({ sending: false, done: false, error: null });

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ sending: true, done: false, error: null });
    try {
      await api('/notes', {
        method: 'POST',
        body: {
          name: form.get('name'),
          relation: form.get('relation'),
          message: form.get('message'),
          website: form.get('website'),
          startedAt,
        },
      });
      forget('/notes');
      setState({ sending: false, done: true, error: null });
    } catch (err) {
      setState({ sending: false, done: false, error: err.message });
    }
  }

  if (state.done) {
    return (
      <div class="note-form note-form--done" role="status">
        <p><strong>Thank you.</strong> Your note will appear here once Lunga has read it.</p>
      </div>
    );
  }

  return (
    <form class="note-form" onSubmit={submit}>
      <h3>Leave a note</h3>
      <label>
        <span>Your name</span>
        <input name="name" required maxLength={80} autoComplete="name" />
      </label>
      <label>
        <span>How you know Lunga <em>(optional)</em></span>
        <input name="relation" maxLength={80} />
      </label>
      <label>
        <span>Your note</span>
        <textarea name="message" required maxLength={1000} rows={4} />
      </label>
      {/* Left empty by people; filled in by bots. */}
      <label class="trap" aria-hidden="true">
        Website <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {state.error && <p class="form-error" role="alert">{state.error}</p>}
      <div class="note-form__foot">
        <small>Notes appear after Lunga approves them.</small>
        <button type="submit" class="btn" disabled={state.sending}>{state.sending ? 'Sending…' : 'Send note'}</button>
      </div>
    </form>
  );
}
