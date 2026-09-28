import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { PRIORITIES, PRIORITY_LABEL, isPrayable, daysBetween } from '../model.js';
import { estimateIntervals, describeInterval, everyDayCheck } from '../scheduler.js';
import { SKIES, DAY_SKIES, COLOUR_SKIES, skyMode, skyForDay, nextSkyText, skyForTime } from '../skies.js';
import { TopBar, Segmented, Switch, useConfirm } from '../components/ui.jsx';
import SkyThumb from '../components/SkyThumb.jsx';
import { Download, Upload, Chevron, Lock } from '../components/Icons.jsx';

export const LOOK_OPTIONS = {
  font: [
    { value: 'sans', label: 'Sans-serif', style: { fontFamily: "'Inter', system-ui, sans-serif" } },
    { value: 'serif', label: 'Serif', style: { fontFamily: "'Newsreader', Georgia, serif", fontSize: 16 } },
  ],
  size: [
    { value: 's', label: 'A', style: { fontSize: 12 } },
    { value: 'm', label: 'A', style: { fontSize: 15 } },
    { value: 'l', label: 'A', style: { fontSize: 18 } },
    { value: 'xl', label: 'A', style: { fontSize: 22 } },
  ],
};

// The three ways to choose the home colour, as big picture buttons.
export function ModeCards({ mode, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }} role="group" aria-label="How to choose the colour">
      <button className="mode-card" aria-pressed={mode === 'time'} onClick={() => onChange('time')}>
        <span style={{ display: 'flex', height: 26, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
          {DAY_SKIES.map((k) => <span key={k} style={{ flex: 1, background: SKIES[k].bg }} />)}
        </span>
        Time of day
      </button>
      <button className="mode-card" aria-pressed={mode === 'random'} onClick={() => onChange('random')}>
        <span style={{ position: 'relative', height: 26, width: 62 }}>
          {['ocean', 'rose', 'aurora'].map((k, i) => (
            <span key={k} style={{ position: 'absolute', left: i * 16, top: [2, 0, 3][i], width: 24, height: 22, borderRadius: 6, background: SKIES[k].bg, transform: `rotate(${[-10, 6, -4][i]}deg)`, boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
          ))}
        </span>
        Random daily
      </button>
      <button className="mode-card" aria-pressed={mode === 'choose'} onClick={() => onChange('choose')}>
        <span style={{ height: 26, display: 'flex', alignItems: 'center' }}><Lock size={20} /></span>
        Choose one
      </button>
    </div>
  );
}

function SkyPicker({ nav }) {
  const { settings, setSetting } = useStore();
  const mode = skyMode(settings.sky);
  const pool = settings.randomPool && settings.randomPool.length ? settings.randomPool : COLOUR_SKIES;
  const todayRandom = skyForDay(pool, nav.now);
  const timeKey = skyForTime(nav.now);

  const changeMode = (m) => {
    if (m === 'time') setSetting('sky', 'time');
    else if (m === 'random') setSetting('sky', 'random');
    else if (mode !== 'choose') setSetting('sky', nav.skyKey);
  };
  const togglePool = (k) => {
    const next = pool.includes(k) ? pool.filter((x) => x !== k) : [...pool, k];
    if (next.length) setSetting('randomPool', next);
  };

  const grid = (children) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px 10px' }}>{children}</div>
  );

  return (
    <div className="surface stack" style={{ gap: 12 }}>
      <span style={{ fontSize: 16, fontWeight: 600 }}>Home colour</span>
      <ModeCards mode={mode} onChange={changeMode} />

      {mode === 'time' && (
        <>
          <span className="small sub" style={{ lineHeight: 1.45 }}>
            The sky changes by itself through the day. Now it’s {SKIES[timeKey].name}; {nextSkyText(timeKey)}.
          </span>
          {grid(DAY_SKIES.map((k) => <SkyThumb key={k} skyKey={k} sub={SKIES[k].times} now={k === timeKey} selected={k === timeKey} />))}
        </>
      )}

      {mode === 'random' && (
        <>
          <span className="small sub" style={{ lineHeight: 1.45 }}>
            Each morning one of your ticked colours is picked for the whole day. Today it’s <b style={{ color: '#fff' }}>{SKIES[todayRandom].name}</b>. Tap a colour to leave it out.
          </span>
          {grid(COLOUR_SKIES.map((k) => {
            const on = pool.includes(k);
            return (
              <SkyThumb key={k} skyKey={k} selected={k === todayRandom} skipped={!on} badge={on ? 'check' : 'off'}
                sub={k === todayRandom ? 'today' : on ? '' : 'skipped'} onClick={() => togglePool(k)}
                label={`${SKIES[k].name}, ${on ? 'included' : 'skipped'}`} />
            );
          }))}
        </>
      )}

      {mode === 'choose' && (
        <>
          <span className="small sub">Tap a colour to use it every day.</span>
          <span className="small" style={{ fontWeight: 600 }}>Colours</span>
          {grid(COLOUR_SKIES.map((k) => (
            <SkyThumb key={k} skyKey={k} selected={settings.sky === k} badge={settings.sky === k ? 'check' : null} onClick={() => setSetting('sky', k)} />
          )))}
          <span className="small" style={{ fontWeight: 600, marginTop: 4 }}>Skies</span>
          {grid(DAY_SKIES.map((k) => (
            <SkyThumb key={k} skyKey={k} selected={settings.sky === k} badge={settings.sky === k ? 'check' : null} onClick={() => setSetting('sky', k)} />
          )))}
        </>
      )}
    </div>
  );
}

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
      <TopBar onBack={() => nav.go('home')} backLabel="Home" />
      <h1 className="title" style={{ padding: '0 4px' }}>Settings</h1>

      <SkyPicker nav={nav} />

      <div className="surface stack" style={{ gap: 12 }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">Reading font</span>
          <Segmented options={LOOK_OPTIONS.font} value={settings.font} onChange={(v) => setSetting('font', v)} label="Reading font" />
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">Text size on prayer cards</span>
          <Segmented options={LOOK_OPTIONS.size} value={settings.size} onChange={(v) => setSetting('size', v)} label="Text size" />
        </div>
        <div className="cream" style={{ borderRadius: 16, padding: '14px 16px', marginTop: 2 }}>
          <div className="pray-name" style={{ marginTop: 0 }}>Sarah Mitchell</div>
          <div className="point" style={{ marginTop: 8 }}><span className="bullet" /><span className="point-text">Wisdom as she starts the new job on Monday</span></div>
        </div>
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
