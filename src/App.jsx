import { useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import Home from './screens/Home.jsx';
import Pray from './screens/Pray.jsx';
import People from './screens/People.jsx';
import CardPage from './screens/CardPage.jsx';
import Settings from './screens/Settings.jsx';
import Help from './screens/Help.jsx';
import Welcome from './screens/Welcome.jsx';
import EditCard from './screens/EditCard.jsx';
import AddNew from './screens/AddNew.jsx';

function useTheme(settings) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const mode = settings.mode === 'system' ? (systemDark ? 'dark' : 'light') : settings.mode;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.style = settings.style;
    root.dataset.mode = mode;
    root.dataset.font = settings.font;
    root.dataset.size = settings.size;
    const page = getComputedStyle(root).getPropertyValue('--page').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', page);
  }, [settings.style, mode, settings.font, settings.size]);
}

export default function App() {
  const store = useStore();
  const { settings, toast, dismissToast } = store;
  useTheme(settings);

  const [screen, setScreen] = useState({ name: 'home' });
  const [editing, setEditing] = useState(null); // card id being edited in the sheet
  const [adding, setAdding] = useState(false);

  const go = (name, params = {}) => { setScreen({ name, ...params }); window.scrollTo(0, 0); };

  if (!settings.onboarded) return <Welcome />;

  const nav = { go, edit: setEditing, add: () => setAdding(true), current: screen.name, from: screen.from };

  let content;
  switch (screen.name) {
    case 'pray': content = <Pray nav={nav} />; break;
    case 'people': content = <People nav={nav} />; break;
    case 'card': content = <CardPage nav={nav} cardId={screen.cardId} from={screen.from} />; break;
    case 'settings': content = <Settings nav={nav} />; break;
    case 'help': content = <Help nav={nav} />; break;
    default: content = <Home nav={nav} />;
  }

  return (
    <>
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
