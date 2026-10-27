export function About({ profile }) {
  const p = profile || {};
  return (
    <div class="pane pane--text">
      <h1>{p.displayName || 'Lunga Ndaba'}</h1>
      <p class="lede">Photographer and videographer{p.location ? ` · ${p.location}` : ''}</p>
      {p.intro ? <p class="intro">{p.intro}</p> : null}
      {p.bio ? (
        p.bio.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
      ) : (
        <p class="placeholder">Bio not added yet.</p>
      )}
    </div>
  );
}
