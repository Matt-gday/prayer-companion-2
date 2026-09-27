import { useMemo, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { PRIORITIES, PRIORITY_LABEL, isPrayable, daysBetween } from '../model.js';
import { estimateIntervals, describeInterval, everyDayCheck } from '../scheduler.js';
import { TopBar, Segmented, Switch, useConfirm } from '../components/ui.jsx';
import { Download, Upload, Chevron } from '../components/Icons.jsx';

export const LOOK_OPTIONS = {
  style: [{ value: 'colourful', label: 'Colourful' }, { value: 'warm', label: 'Warm' }],
  mode: [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }],
  font: [
    { value: 'serif', label: 'Serif', style: { fontFamily: "'Newsreader', Georgia, serif", fontSize: 16 } },
    { value: 'sans', label: 'Sans-serif', style: { fontFamily: "'Inter', system-ui, sans-serif" } },
  ],
  size: [
    { value: 's', label: 'A', style: { fontSize: 12 } },
    { value: 'm', label: 'A', style: { fontSize: 15 } },
    { value: 'l', label: 'A', style: { fontSize: 18 } },
    { value: 'xl', label: 'A', style: { fontSize: 22 } },
  ],
};

export default function Settings({ nav }) {
  const { people, cards, settings, date, setSetting, setLimit, setDemo, exportBackup, readBackup, restoreBackup } = useStore();
  const [ask, confirmNode] = useConfirm();
  const [fileError, setFileError] = useState('');
  const fileRef = useRef(null);
  const limit = settings.limit;

  const estimates = useMemo(() => estimateIntervals(cards, people, limit, date), [cards, people, limit, date]);
  const counts = Object.fromEntries(PRIORITIES.map((p) => [p, cards.filter((c) => c.priority === p && isPrayable(c, people)).length]));
  const everyDay = everyDayCheck(cards, people, limit);
  const backupAge = settings.lastBackup ? daysBetween(settings.lastBackup, date) : null;

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileError('');
    const reader = new FileReader();
    reader.onload = () => {
      let restored;
      try {
        restored = readBackup(reader.result);
      } catch {
        setFileError('That file isn’t a Prayer Companion backup. Choose the .json file you downloaded from the app.');
        return;
      }
      const n = restored.cards.filter((c) => !c.archived).length;
      ask({
        title: restored.kind === 'v1' ? 'Import from the old app?' : 'Restore this backup?',
        message: `This backup has ${n} card${n === 1 ? '' : 's'} and ${restored.people.length} people. It will replace everything in the app now${settings.demo ? ' (demo mode will turn off)' : ''}.`,
        confirmLabel: restored.kind === 'v1' ? 'Import' : 'Restore',
        onConfirm: () => { restoreBackup(restored); nav.go('home'); },
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="screen">
      <TopBar onBack={() => nav.go('home')} backLabel="Home" />
      <h1 className="title" style={{ padding: '0 4px' }}>Settings</h1>

      <div className="surface stack" style={{ gap: 12 }}>
        <Setting label="Style"><Segmented options={LOOK_OPTIONS.style} value={settings.style} onChange={(v) => setSetting('style', v)} label="Style" /></Setting>
        <Setting label="Appearance"><Segmented options={LOOK_OPTIONS.mode} value={settings.mode} onChange={(v) => setSetting('mode', v)} label="Appearance" /></Setting>
        <Setting label="Reading font"><Segmented options={LOOK_OPTIONS.font} value={settings.font} onChange={(v) => setSetting('font', v)} label="Reading font" /></Setting>
        <Setting label="Text size on prayer cards"><Segmented options={LOOK_OPTIONS.size} value={settings.size} onChange={(v) => setSetting('size', v)} label="Text size" /></Setting>
        <div className="pray-name" style={{ marginTop: 4 }}>Sarah Mitchell</div>
        <div className="point-text">Wisdom as she starts the new job on Monday</div>
      </div>

      <div className="surface stack" style={{ gap: 12 }}>
        <div className="spread">
          <span className="stack" style={{ gap: 2 }}>
            <span style={{ fontWeight: 500 }}>Cards per day</span>
            <span className="tiny sub">Missed days never pile up</span>
          </span>
          <span className="row" style={{ gap: 4 }}>
            <button className="btn soft" style={{ width: 44, height: 44, padding: 0, borderRadius: 12, fontSize: 22 }} onClick={() => setLimit(Math.max(1, limit - 1))} aria-label="Fewer cards">−</button>
            <span style={{ width: 40, textAlign: 'center', fontSize: 20, fontWeight: 600 }} aria-live="polite">{limit}</span>
            <button className="btn soft" style={{ width: 44, height: 44, padding: 0, borderRadius: 12, fontSize: 22 }} onClick={() => setLimit(Math.min(99, limit + 1))} aria-label="More cards">+</button>
          </span>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">How often each priority comes up at {limit} a day</span>
          {PRIORITIES.map((p) => (
            <div key={p} className="spread small">
              <span className="row" style={{ gap: 8 }}><span className={`dot dot-${p}`} />{PRIORITY_LABEL[p]} <span className="muted">· {counts[p]} card{counts[p] === 1 ? '' : 's'}</span></span>
              <span className="sub">{describeInterval(estimates[p])}</span>
            </div>
          ))}
          {everyDay.count > 0 && <span className="tiny sub">{everyDay.count} High card{everyDay.count === 1 ? ' is' : 's are'} set to every day.</span>}
        </div>
        {everyDay.full && (
          <div className="warn">
            Your {everyDay.count} every-day cards fill all {limit} places, so nobody else will come up. Raise the number above, or turn off Every day on some cards.
          </div>
        )}
      </div>

      <div className="surface stack" style={{ gap: 4 }}>
        <label className="field">Your name
          <input className="input" value={settings.name} onChange={(e) => setSetting('name', e.target.value)} placeholder="First name" />
        </label>
      </div>

      <div className="list">
        <button className="list-row" onClick={exportBackup}>
          <span style={{ color: 'var(--acc)' }}><Download /></span>
          <span className="grow stack" style={{ gap: 2 }}>
            <span>Download backup</span>
            <span className="tiny" style={{ color: backupAge == null || backupAge > 30 ? 'var(--warn-ink)' : 'var(--sub)' }}>
              {backupAge == null ? 'Not saved yet. Save one now and then about monthly.' : backupAge === 0 ? 'Saved today' : `Last saved ${backupAge} day${backupAge === 1 ? '' : 's'} ago`}
            </span>
          </span>
        </button>
        <button className="list-row" onClick={() => fileRef.current?.click()}>
          <span style={{ color: 'var(--acc)' }}><Upload /></span>
          <span className="grow stack" style={{ gap: 2 }}>
            <span>Restore from backup</span>
            <span className="tiny sub">Backups from the old app work too</span>
          </span>
        </button>
        <div className="list-row">
          <span className="grow stack" style={{ gap: 2 }}>
            <span>Demo mode</span>
            <span className="tiny sub">Try the app with sample people. Your own list is kept safe.</span>
          </span>
          <Switch checked={settings.demo} label="Demo mode" onChange={setDemo} />
        </div>
        <button className="list-row" onClick={() => nav.go('help')}>
          <span className="grow">How to use the app</span>
          <span className="muted"><Chevron /></span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} hidden />
      {fileError && <div className="warn">{fileError}</div>}
      <div className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>Prayer Companion 2 · your data stays on this device</div>
      {confirmNode}
    </div>
  );
}

const Setting = ({ label, children }) => (
  <div className="stack" style={{ gap: 6 }}>
    <span className="label">{label}</span>
    {children}
  </div>
);
