import { useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import { SKIES, DEFAULT_GLASS, currentSky } from './skies.js';
import Home from './screens/Home.jsx';
import Pray from './screens/Pray.jsx';
import People from './screens/People.jsx';
import CardPage from './screens/CardPage.jsx';
import Settings from './screens/Settings.jsx';
import Help from './screens/Help.jsx';
import Welcome from './screens/Welcome.jsx';
import EditCard from './screens/EditCard.jsx';
import AddFlow from './screens/AddFlow.jsx';
import { ListsHome, ListPage } from './screens/Lists.jsx';

// Re-check the clock every minute and when the app comes back to the front,
// so "time of day" skies move on by themselves.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return now;
}

export const ONBOARDING_BG = 'linear-gradient(180deg, #141E46 0%, #1B3A6B 30%, #1F6F8B 62%, #23918F 84%, #2FA89B 100%)';
const lastColour = (bg) => (bg.match(/#[0-9A-Fa-f]{6}/g) || []).pop();

// Home-screen apps on iPhone lay the page out a status bar's height shorter
// than the screen, so a background drawn on the page stops short. The page's
// back layer (the <html> background) is painted edge to edge, so the sky is
// painted there too, sized to the full screen height, with the sky layer
// matching it exactly.
const setScreenHeight = () => {
  const h = Math.max(window.screen?.height || 0, window.innerHeight, document.documentElement.clientHeight);
  document.documentElement.style.setProperty('--screen-h', `${h}px`);
};

function useSky(settings, now) {
  const key = currentSky(settings, now);
  const sky = SKIES[key];
  useEffect(() => {
    const bg = settings.onboarded ? sky.bg : ONBOARDING_BG;
    const html = document.documentElement;
    setScreenHeight();
    html.style.backgroundColor = lastColour(bg);
    html.style.backgroundImage = bg;
    html.style.backgroundSize = '100% var(--screen-h)';
    html.style.backgroundRepeat = 'no-repeat';
    document.body.style.background = 'transparent';
    const root = document.documentElement;
    root.dataset.font = settings.font;
    root.dataset.size = settings.size;
    root.style.setProperty('--z', { s: 0.9, m: 0.95, l: 1, xl: 1.1 }[settings.size] || 1);
    root.style.setProperty('--acc', sky.go);
    root.style.setProperty('--ring', sky.ring);
    root.style.setProperty('--glass', sky.glass || DEFAULT_GLASS);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.onboarded ? sky.top : '#141E46');
  }, [key, sky, settings.font, settings.size, settings.onboarded]);
  return key;
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', setScreenHeight);
  window.addEventListener('orientationchange', setScreenHeight);
}

export function SkyBackground({ skyKey, quiet }) {
  const sky = SKIES[skyKey];
  return (
    <div className={`sky-bg ${quiet ? 'quiet' : ''}`} aria-hidden="true">
      <div style={{ background: sky.bg }} />
      {sky.stars && <div className="sky-stars" />}
      {sky.sun && <><div className="sky-rays" /><div className="sky-sun" /></>}
    </div>
  );
}

export default function App() {
  const store = useStore();
  const { settings, toast, dismissToast } = store;
  const now = useNow();
  const skyKey = useSky(settings, now);

  const [screen, setScreen] = useState({ name: 'home' });
  const [editing, setEditing] = useState(null); // card id being edited in the sheet

  const go = (name, params = {}) => { setScreen({ name, ...params }); window.scrollTo(0, 0); };

  if (!settings.onboarded) {
    return <div className="onb"><div className="onb-bg" /><Welcome skyKey={skyKey} now={now} /></div>;
  }

  const nav = { go, edit: setEditing, add: () => go('add', { from: screen.name }), current: screen.name, from: screen.from, skyKey, now };

  let content;
  switch (screen.name) {
    case 'pray': content = <Pray nav={nav} />; break;
    case 'people': content = <People nav={nav} />; break;
    case 'card': content = <CardPage nav={nav} cardId={screen.cardId} from={screen.from} />; break;
    case 'settings': content = <Settings nav={nav} focus={screen.focus} />; break;
    case 'help': content = <Help nav={nav} />; break;
    case 'add': content = <AddFlow nav={nav} from={screen.from} />; break;
    case 'lists': content = <ListsHome nav={nav} />; break;
    case 'list': content = <ListPage nav={nav} listId={screen.listId} />; break;
    default: content = <Home nav={nav} />;
  }

  return (
    <>
      <SkyBackground skyKey={skyKey} quiet={screen.name !== 'home'} />
      {content}
      {editing && <EditCard cardId={editing} nav={nav} onClose={() => setEditing(null)} />}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.message}</span>
          {toast.undo && <button onClick={() => { toast.undo(); dismissToast(); }}>Undo</button>}
        </div>
      )}
    </>
  );
}
