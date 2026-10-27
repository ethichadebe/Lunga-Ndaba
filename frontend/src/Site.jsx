import { useData } from './api.js';
import { useMedia } from './shell.jsx';
import { DesktopOS } from './Desktop.jsx';
import { DeviceOS } from './Device.jsx';

// Which machine the visitor is holding decides the frame:
//   phone  - a phone: lock screen, home screen, full-screen apps
//   tablet - the same device, laid out for the bigger screen
//   desktop - windows, a menu bar and a dock
const PHONE = '(max-width: 760px)';
const TABLET = '(max-width: 1023px), (max-width: 1366px) and (pointer: coarse)';

export function Site() {
  const phone = useMedia(PHONE);
  const tablet = useMedia(TABLET);
  const work = useData('/work');
  const profile = useData('/profile').data;
  if (phone || tablet) return <DeviceOS mode={phone ? 'phone' : 'tablet'} work={work} profile={profile} />;
  return <DesktopOS work={work} profile={profile} />;
}
