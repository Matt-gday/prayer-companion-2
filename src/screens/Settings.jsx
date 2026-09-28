import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { PRIORITIES, PRIORITY_LABEL, isPrayable, daysBetween } from '../model.js';
import { estimateIntervals, describeInterval, everyDayCheck } from '../scheduler.js';
import { Switch, useConfirm } from '../components/ui.jsx';
import { SkyChooser, FontCards, SizeSlider, TextPreview } from '../components/Choosers.jsx';
import { Download, Upload, Chevron, Back } from '../components/Icons.jsx';

export default function Settings({ nav, focus }) {
  const { people, cards, settings, date, setSetting, setLimit, setDemo, exportBackup, readBackup, restoreBackup } = useStore();
  const [ask, confirmNode] = useConfirm();
  const [fileError, setFileError] = useState('');
  const [glow, setGlow] = useState(false);
  const fileRef = useRef(null);
  const backupRef = useRef(null);
  const limit = settings.limit;

  // Arriving from the Backup tile: scroll to the backup section and make it glow.
  useEffect(() => {
    if (focus !== 'backup' || !backupRef.current) return undefined;
    const t = setTimeout(() => {
      backupRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setGlow(true);
    }, 150);
    return () => clearTimeout(t);
  }, [focus]);

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
      <div className="topbar pinned">
        <button className="back" onClick={() => nav.go('home')}><Back />Home</button>
        <span className="small" style={{ opacity: 0.85, paddingRight: 6 }}>Settings</span>
      </div>
      <h1 className="title" style={{ padding: '0 4px' }}>Settings</h1>

      <div className="surface stack" style={{ gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Home colour</span>
        <SkyChooser sky={settings.sky} randomPool={settings.randomPool} now={nav.now} currentKey={nav.skyKey} previewName={settings.name}
          onChange={(patch) => Object.entries(patch).forEach(([k, v]) => setSetting(k, v))} />
      </div>

      <div className="surface stack" style={{ gap: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Make it easy to read</span>
        <FontCards value={settings.font} onChange={(v) => setSetting('font', v)} />
        <span className="label" style={{ marginTop: 4 }}>Text size · whole app</span>
        <SizeSlider value={settings.size} onChange={(v) => setSetting('size', v)} />
        <TextPreview />
      </div>

      <div className="surface stack" style={{ gap: 12 }}>
        <div className="spread">
          <span className="stack" style={{ gap: 2 }}>
            <span style={{ fontWeight: 600 }}>Cards per day</span>
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
              <span className="row" style={{ gap: 8 }}><span className={`dot dot-${p}`} />{PRIORITY_LABEL[p]} <span className="sub">· {counts[p]} card{counts[p] === 1 ? '' : 's'}</span></span>
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

      <div ref={backupRef} id="backup" className={`surface stack ${glow ? 'highlight' : ''}`} style={{ gap: 10 }} onAnimationEnd={() => setGlow(false)}>
        <div className="spread">
          <span style={{ fontWeight: 600 }}>Backup</span>
          <span className="tiny" style={{ color: backupAge == null || backupAge > 30 ? '#FFE3A0' : 'var(--sub)' }}>
            {backupAge == null ? 'Not saved yet' : backupAge === 0 ? 'Saved today' : `Saved ${backupAge} day${backupAge === 1 ? '' : 's'} ago`}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <button className="btn white small" style={{ height: 46, borderRadius: 14 }} onClick={exportBackup}><Download size={18} />Download</button>
          <button className="btn soft small" style={{ height: 46, borderRadius: 14 }} onClick={() => fileRef.current?.click()}><Upload size={18} />Restore</button>
        </div>
        <span className="tiny sub">Save one about once a month and before changing phones. Backups from the old app work too.</span>
        {fileError && <div className="warn">{fileError}</div>}
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} hidden />

      <div className="list">
        <label className="list-row" style={{ gap: 10 }}>
          <span className="grow">Your name</span>
          <input className="input" style={{ width: 150, height: 38, textAlign: 'right' }} value={settings.name} onChange={(e) => setSetting('name', e.target.value)} placeholder="First name" />
        </label>
        <div className="list-row">
          <span className="grow stack" style={{ gap: 2 }}>
            <span>Demo mode</span>
            <span className="tiny sub">Try the app with sample people. Your own list is kept safe.</span>
          </span>
          <Switch checked={settings.demo} label="Demo mode" onChange={setDemo} />
        </div>
        <button className="list-row" onClick={() => nav.go('help')}>
          <span className="grow">How to use the app</span>
          <span className="sub"><Chevron /></span>
        </button>
      </div>
      <div className="tiny" style={{ textAlign: 'center', marginTop: 8, opacity: 0.75 }}>Prayer Companion 2 · your data stays on this device</div>
      {confirmNode}
    </div>
  );
}
