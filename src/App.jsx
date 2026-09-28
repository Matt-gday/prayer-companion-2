import { useEffect, useRef, useState } from 'react';
import { useStore } from './store.jsx';
import { SKIES, DEFAULT_GLASS, currentSky } from './skies.js';
import { scrollToTop } from './scroll.js';
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

// The sky is painted on the page's back layer (the <html> background), which
// iPhone home-screen apps draw edge to edge. The page itself never scrolls
// (each screen scrolls inside #root), so the sky never moves and there is
// no seam. Stars and the sunrise glow are painted there too; only the soft
// rays are a separate layer, and they fade out before the bottom edge.
const setScreenHeight = () => {
  const h = Math.max(window.screen?.height || 0, window.innerHeight, document.documentElement.clientHeight);
  document.documentElement.style.setProperty('--screen-h', `${h}px`);
};

const STARS = [
  [1.4, 18, 10], [1, 72, 7], [1.6, 86, 20], [1, 42, 26], [1, 10, 38], [1.4, 64, 34],
  [1, 90, 46], [1.2, 28, 54], [1, 55, 60], [1, 8, 66], [1.4, 78, 70], [1, 35, 16],
].map(([r, x, y]) => `radial-gradient(${r}px ${r}px at ${x}% ${y}%, rgba(255,255,255,.75) 50%, transparent 51%)`);

const sunGlow = (quiet) => (quiet
  ? 'radial-gradient(circle 240px at 50% calc(114% - 170px), rgba(255,253,240,.5) 0%, rgba(255,241,190,.5) 14%, rgba(255,217,138,.45) 24%, rgba(255,196,110,.28) 38%, rgba(255,170,110,.09) 55%, rgba(255,170,110,0) 70%)'
  : 'radial-gradient(circle 240px at 50% calc(96% - 170px), #FFFDF0 0%, #FFF1BE 14%, #FFD98A 24%, rgba(255,196,110,.55) 38%, rgba(255,170,110,.18) 55%, rgba(255,170,110,0) 70%)');

function useSky(settings, now, quiet) {
  const key = currentSky(settings, now);
  const sky = SKIES[key];
  useEffect(() => {
    const html = document.documentElement;
    setScreenHeight();
    let layers = [ONBOARDING_BG];
    if (settings.onboarded) {
      layers = [sky.bg];
      if (sky.sun) layers.unshift(sunGlow(quiet));
      if (sky.stars) layers.unshift(...STARS);
    }
    // iPhone home-screen apps have a strip below the page that only ever shows
    // the page's plain background colour. Ease the bottom of the sky into that
    // exact colour so the two meet with no visible line.
    const last = lastColour(layers[layers.length - 1]);
    layers.unshift(`linear-gradient(180deg, ${last}00 84%, ${last} 96%)`);
    html.style.backgroundColor = last;
    html.style.backgroundImage = layers.join(', ');
    html.style.backgroundSize = '100% var(--screen-h)';
    html.style.backgroundRepeat = 'no-repeat';
    html.dataset.font = settings.font;
    html.dataset.size = settings.size;
    html.style.setProperty('--z', { s: 0.9, m: 0.95, l: 1, xl: 1.1 }[settings.size] || 1);
    html.style.setProperty('--acc', sky.go);
    html.style.setProperty('--ring', sky.ring);
    html.style.setProperty('--glass', sky.glass || DEFAULT_GLASS);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.onboarded ? sky.top : '#141E46');
  }, [key, sky, settings.font, settings.size, settings.onboarded, quiet]);
  return key;
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', setScreenHeight);
  window.addEventListener('orientationchange', setScreenHeight);
}

// The scrolling area. Marks itself "more" while there's content below, which
// fades the bottom edge; at the end, or when everything fits, it's crisp.
function Scroller({ className = '', children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => el.classList.toggle('more', el.scrollHeight - el.clientHeight - el.scrollTop > 4);
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); mo.disconnect(); };
  }, []);
  return <div ref={ref} className={`scroller ${className}`}>{children}</div>;
}

// Only the sunrise rays live in their own layer.
export function SkyBackground({ skyKey, quiet }) {
  if (!SKIES[skyKey].sun) return null;
  return <div className={`sky-bg ${quiet ? 'quiet' : ''}`} aria-hidden="true"><div className="sky-rays" /></div>;
}

export default function App() {
  const store = useStore();
  const { settings, toast, dismissToast } = store;
  const now = useNow();
  const [screen, setScreen] = useState({ name: 'home' });
  const skyKey = useSky(settings, now, screen.name !== 'home');

  const [editing, setEditing] = useState(null); // card id being edited in the sheet

  const go = (name, params = {}) => { setScreen({ name, ...params }); scrollToTop(); };

  if (!settings.onboarded) {
    return <Scroller className="onb"><Welcome skyKey={skyKey} now={now} /></Scroller>;
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
      <Scroller>{content}</Scroller>
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
