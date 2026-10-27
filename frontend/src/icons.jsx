// The whole icon set, drawn for this site. No system or brand artwork.
//
// Rules, so new icons stay in the family:
//  - App tiles: 48 x 48, a rounded paper tile with an ink outline.
//  - Glyphs sit inside 12..36. Stroke 2.25, round caps and joins, ink only.
//  - Exactly one safelight-amber detail per tile icon. Never more.
//  - UI glyphs: 24 x 24, stroke 1.75, ink (currentColor), no amber.

const INK = 'var(--ink)';
const PAPER = 'var(--paper)';
const AMBER = 'var(--amber)';

function Tile({ children, label, size = 48 }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      fill="none"
      stroke={INK}
      stroke-width="2.25"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="3" y="3" width="42" height="42" rx="12" fill={PAPER} />
      {children}
    </svg>
  );
}

// Work: a strip of negatives in a sleeve. One frame glows.
export const WorkIcon = (p) => (
  <Tile {...p}>
    <rect x="11" y="14" width="26" height="20" rx="2.5" />
    <path d="M14 17.5h1.5M19 17.5h1.5M24 17.5h1.5M29 17.5h1.5M33 17.5h.5M14 30.5h1.5M19 30.5h1.5M24 30.5h1.5M29 30.5h1.5M33 30.5h.5" />
    <rect x="15" y="21" width="8" height="6" rx="1" />
    <rect x="25" y="21" width="8" height="6" rx="1" fill={AMBER} />
  </Tile>
);

// Films: a clapper. One stripe is lit.
export const FilmsIcon = (p) => (
  <Tile {...p}>
    <rect x="12" y="21" width="24" height="15" rx="2.5" />
    <path d="M12.5 21l22-6.5" />
    <path d="M12 15.8l23-6.3 1.4 5-23 6.3z" />
    <path d="M18.5 14l2.2 5.1M24.5 12.4l2.2 5.1" />
    <path d="M30.4 10.8l2.2 5.1" stroke={AMBER} stroke-width="3" />
    <path d="M17 27h14M17 31h9" />
  </Tile>
);

// Notes: a card held up with an amber pin.
export const NotesIcon = (p) => (
  <Tile {...p}>
    <path d="M14.5 15.5l18.6-2.4 2.4 19.4-18.6 2.4z" />
    <path d="M18.8 22l11-1.4M19.4 26.4l11-1.4M20 30.7l6.5-.8" />
    <circle cx="24" cy="15" r="2.6" fill={AMBER} />
  </Tile>
);

// About: an ID card. The name line is amber.
export const AboutIcon = (p) => (
  <Tile {...p}>
    <rect x="10.5" y="14" width="27" height="20" rx="3" />
    <circle cx="18.5" cy="21.5" r="3" />
    <path d="M13.8 30c.9-2.6 2.6-3.9 4.7-3.9s3.8 1.3 4.7 3.9" />
    <path d="M26 20.5h7.5" stroke={AMBER} stroke-width="3" />
    <path d="M26 25h7.5M26 29h5" />
  </Tile>
);

// Contact: an envelope with an amber stamp.
export const ContactIcon = (p) => (
  <Tile {...p}>
    <rect x="10.5" y="15" width="27" height="19" rx="2.5" />
    <path d="M11.5 16.5L24 26l12.5-9.5" />
    <rect x="29.5" y="18.5" width="4.5" height="4.5" rx=".8" fill={AMBER} stroke-width="1.5" />
  </Tile>
);

// Instagram, drawn as a plain camera body with an outbound arrow. Not their logo.
export const OutboundCameraIcon = (p) => (
  <Tile {...p}>
    <rect x="10.5" y="18" width="23" height="16" rx="3" />
    <path d="M16 18l1.6-3h6.8l1.6 3" />
    <circle cx="22" cy="26" r="4.2" />
    <path d="M31 11.5h6v6M37 11.5l-7 7" stroke={AMBER} />
  </Tile>
);

export const MarkIcon = ({ size = 20, label = 'Lunga Ndaba' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label} fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1.5" y="1.5" width="21" height="21" rx="6" />
    <path d="M6.5 7v10h4.2" />
    <path d="M12.8 17V7l4.7 10V7" />
    <circle cx="19.2" cy="4.8" r="1.6" fill={AMBER} stroke="none" />
  </svg>
);

// ── UI glyphs ────────────────────────────────────────────────────────────
function Glyph({ children, size = 20, label }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.75"
      stroke-linecap="round" stroke-linejoin="round" role={label ? 'img' : undefined} aria-label={label}
      aria-hidden={label ? undefined : 'true'}>
      {children}
    </svg>
  );
}

export const CloseGlyph = (p) => <Glyph {...p}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></Glyph>;
export const MaximiseGlyph = (p) => <Glyph {...p}><path d="M14 5h5v5M10 19H5v-5M19 5l-5.5 5.5M5 19l5.5-5.5" /></Glyph>;
export const RestoreGlyph = (p) => <Glyph {...p}><path d="M19 10h-5V5M5 14h5v5M14 10l5.5-5.5M10 14l-5.5 5.5" /></Glyph>;
export const BackGlyph = (p) => <Glyph {...p}><path d="M14.5 5.5L8 12l6.5 6.5" /></Glyph>;
export const NextGlyph = (p) => <Glyph {...p}><path d="M9.5 5.5L16 12l-6.5 6.5" /></Glyph>;
export const UpGlyph = (p) => <Glyph {...p}><path d="M5.5 14.5L12 8l6.5 6.5" /></Glyph>;
export const DownGlyph = (p) => <Glyph {...p}><path d="M5.5 9.5L12 16l6.5-6.5" /></Glyph>;
export const UploadGlyph = (p) => <Glyph {...p}><path d="M12 15V4.5M7.5 9L12 4.5 16.5 9M4.5 15v3.5a1 1 0 001 1h13a1 1 0 001-1V15" /></Glyph>;
export const DownloadGlyph = (p) => <Glyph {...p}><path d="M12 4.5V15M7.5 10.5L12 15l4.5-4.5M4.5 15v3.5a1 1 0 001 1h13a1 1 0 001-1V15" /></Glyph>;
export const TrashGlyph = (p) => <Glyph {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9L17.5 7M10.5 11v5M13.5 11v5" /></Glyph>;
export const StarGlyph = ({ filled, ...p }) => (
  <Glyph {...p}><path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill={filled ? 'currentColor' : 'none'} /></Glyph>
);
export const EyeGlyph = (p) => <Glyph {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></Glyph>;
export const PlusGlyph = (p) => <Glyph {...p}><path d="M12 5v14M5 12h14" /></Glyph>;
export const CheckGlyph = (p) => <Glyph {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Glyph>;
export const LinkGlyph = (p) => <Glyph {...p}><path d="M14 5h5v5M19 5l-8 8M17 14v4.5a1 1 0 01-1 1H5.5a1 1 0 01-1-1V8a1 1 0 011-1H10" /></Glyph>;
export const RetryGlyph = (p) => <Glyph {...p}><path d="M19 12a7 7 0 11-2.1-5M19 4.5V9h-4.5" /></Glyph>;

// Play: our own disc and triangle, drawn for the video poster.
export const PlayMark = ({ size = 64 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="var(--paper)" stroke="var(--ink)" stroke-width="2.5" />
    <path d="M26 20.5v23l18.5-11.5z" fill="var(--amber)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" />
  </svg>
);

// The dock's apps, in order. `href` is the window's address.
export const APPS = [
  { id: 'work', href: '/work', label: 'Work', Icon: WorkIcon },
  { id: 'films', href: '/films', label: 'Films', Icon: FilmsIcon },
  { id: 'notes', href: '/notes', label: 'Notes', Icon: NotesIcon },
  { id: 'about', href: '/about', label: 'About', Icon: AboutIcon },
  { id: 'contact', href: '/contact', label: 'Contact', Icon: ContactIcon },
];
