import { render } from 'preact';
import { lazy, Suspense } from 'preact/compat';
import { usePath } from './router.js';
import { Site } from './Site.jsx';
import './styles.css';

// The admin is a separate download: visitors never load it.
const Admin = lazy(() => import('./admin/Admin.jsx'));

function Root() {
  const path = usePath();
  if (path === '/admin' || path.startsWith('/admin/')) {
    return (
      <Suspense fallback={<div class="admin-loading" />}>
        <Admin />
      </Suspense>
    );
  }
  return <Site />;
}

render(<Root />, document.getElementById('app'));
