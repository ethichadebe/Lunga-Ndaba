import { onLink } from '../router.js';
import { ContactIcon, OutboundCameraIcon, NotesIcon } from '../icons.jsx';

export function Contact({ profile }) {
  const p = profile || {};
  return (
    <div class="pane pane--text">
      <h1>Contact</h1>
      <ul class="contact">
        <li>
          <ContactIcon size={40} />
          {p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : <span class="placeholder placeholder--inline">Email not added yet.</span>}
        </li>
        {p.instagram && (
          <li>
            <OutboundCameraIcon size={40} />
            <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noopener noreferrer">@{p.instagram} on Instagram</a>
          </li>
        )}
        <li>
          <NotesIcon size={40} />
          <a href="/notes" onClick={onLink}>Leave a note</a>
        </li>
      </ul>
    </div>
  );
}
