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
import AddNew from './screens/AddNew.jsx';

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

function useSky(settings, now) {
  const key = currentSky(settings, now);
  const sky = SKIES[key];
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.font = settings.font;
    root.dataset.size = settings.size;
    root.style.setProperty('--acc', sky.go);
    root.style.setProperty('--ring', sky.ring);
    root.style.setProperty('--glass', sky.glass || DEFAULT_GLASS);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sky.top);
    document.body.style.background = sky.top;
  }, [key, sky, settings.font, settings.size]);
  return key;
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
  const [adding, setAdding] = useState(false);

  const go = (name, params = {}) => { setScreen({ name, ...params }); window.scrollTo(0, 0); };

  if (!settings.onboarded) {
    return <><SkyBackground skyKey={skyKey} /><Welcome skyKey={skyKey} /></>;
  }

  const nav = { go, edit: setEditing, add: () => setAdding(true), current: screen.name, from: screen.from, skyKey, now };

  let content;
  switch (screen.name) {
    case 'pray': content = <Pray nav={nav} />; break;
    case 'people': content = <People nav={nav} />; break;
    case 'card': content = <CardPage nav={nav} cardId={screen.cardId} from={screen.from} />; break;
    case 'settings': content = <Settings nav={nav} focus={screen.focus} />; break;
    case 'help': content = <Help nav={nav} />; break;
    default: content = <Home nav={nav} />;
  }

  return (
    <>
      <SkyBackground skyKey={skyKey} quiet={screen.name !== 'home'} />
      {content}
      {editing && <EditCard cardId={editing} nav={nav} onClose={() => setEditing(null)} />}
      {adding && <AddNew nav={nav} onClose={() => setAdding(false)} />}
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.message}</span>
          {toast.undo && <button onClick={() => { toast.undo(); dismissToast(); }}>Undo</button>}
        </div>
      )}
    </>
  );
}
