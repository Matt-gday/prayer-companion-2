import { useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { Segmented } from '../components/ui.jsx';
import { LOOK_OPTIONS } from './Settings.jsx';

const SWATCHES = [
  { value: 'colourful', label: 'Colourful', band: '#FFE4DA', ink: '#1E2233' },
  { value: 'warm', label: 'Warm', band: '#F1E6D6', ink: '#2A2622' },
];

export default function Welcome() {
  const { settings, setSetting, setDemo, readBackup, restoreBackup } = useStore();
  const [name, setName] = useState(settings.name);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(null);
  const fileRef = useRef(null);

  const finish = () => {
    setSetting('name', name.trim());
    setSetting('onboarded', true);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const restored = readBackup(reader.result);
        setPending(restored);
        setMessage(`Found ${restored.cards.filter((c) => !c.archived).length} cards and ${restored.people.length} people.`);
        if (!name.trim() && restored.userName) setName(restored.userName);
      } catch {
        setPending(null);
        setMessage('That file isn’t a Prayer Companion backup. Choose the .json file you downloaded from the old app.');
      }
    };
    reader.readAsText(file);
  };

  const importAndStart = () => {
    restoreBackup(pending);
    setSetting('name', (name.trim() || pending.userName || '').trim());
    setSetting('onboarded', true);
  };

  return (
    <div className="screen" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)', gap: 16 }}>
      <h1 className="title" style={{ fontSize: 36 }}>Welcome to Prayer Companion</h1>
      <p className="sub" style={{ lineHeight: 1.5, fontSize: 16 }}>A simple way to keep praying for the people in your life, a few each day.</p>

      <label className="field" style={{ fontSize: 13 }}>What should we call you?
        <input className="input" style={{ background: 'var(--card)', height: 52, fontSize: 17 }} placeholder="Your first name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="stack" style={{ gap: 8 }}>
        <span className="label" style={{ fontSize: 13 }}>Pick a look</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {SWATCHES.map((s) => (
            <button key={s.value} onClick={() => setSetting('style', s.value)} aria-pressed={settings.style === s.value}
              style={{ borderRadius: 16, overflow: 'hidden', background: '#fff', textAlign: 'left', border: `2px solid ${settings.style === s.value ? 'var(--acc)' : 'var(--line)'}` }}>
              <span style={{ display: 'block', height: 30, background: s.band }} />
              <span style={{ display: 'block', padding: '9px 12px', fontSize: 13, fontWeight: 500, color: s.ink }}>{s.label}</span>
            </button>
          ))}
        </div>
        <Segmented onPage options={LOOK_OPTIONS.font} value={settings.font} onChange={(v) => setSetting('font', v)} label="Reading font" />
        <Segmented onPage options={LOOK_OPTIONS.mode} value={settings.mode} onChange={(v) => setSetting('mode', v)} label="Appearance" />
        <span className="tiny muted">You can change any of these later in Settings.</span>
      </div>

      <div className="surface stack" style={{ marginTop: 'auto', gap: 10 }}>
        <span style={{ fontWeight: 500 }}>Moving from the old app?</span>
        <span className="small sub" style={{ lineHeight: 1.45 }}>
          In the old app, tap the backup button and download a backup. Then choose that file here. Everyone, their prayer points and history come across.
        </span>
        {message && <span className="small" style={{ color: pending ? 'var(--green)' : 'var(--danger)' }}>{message}</span>}
        {pending
          ? <button className="btn accent" onClick={importAndStart}>Import and start</button>
          : <button className="btn soft" style={{ color: 'var(--acc)', fontWeight: 600 }} onClick={() => fileRef.current?.click()}>Import old app backup</button>}
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} hidden />
      </div>
      <button className="btn primary" onClick={finish}>{pending ? 'Start fresh instead' : 'Start fresh'}</button>
      <button className="link" style={{ alignSelf: 'center' }} onClick={() => { setDemo(true); finish(); }}>Look around with sample people first</button>
    </div>
  );
}
