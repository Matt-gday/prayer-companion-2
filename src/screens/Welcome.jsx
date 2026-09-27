import { useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { Segmented } from '../components/ui.jsx';
import { Next } from '../components/Icons.jsx';
import { LOOK_OPTIONS, ModeCards } from './Settings.jsx';
import { skyMode } from '../skies.js';

export default function Welcome({ skyKey }) {
  const { settings, setSetting, setDemo, readBackup, restoreBackup } = useStore();
  const [name, setName] = useState(settings.name);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(null);
  const fileRef = useRef(null);
  const mode = skyMode(settings.sky);

  const finish = () => {
    setSetting('name', name.trim());
    setSetting('onboarded', true);
  };

  const pickMode = (m) => setSetting('sky', m === 'choose' ? skyKey : m);

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
    <div className="screen" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 36px)', gap: 16 }}>
      <h1 className="title" style={{ fontSize: 40 }}>Welcome to Prayer Companion</h1>
      <p style={{ lineHeight: 1.5, fontSize: 16, opacity: 0.9 }}>A simple way to keep praying for the people in your life, a few each day.</p>

      <input className="input glass" style={{ height: 52, fontSize: 17, background: 'var(--glass)' }} placeholder="Your first name"
        aria-label="Your first name" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="stack" style={{ gap: 8 }}>
        <span className="small" style={{ opacity: 0.9 }}>Pick your sky</span>
        <ModeCards mode={mode} onChange={pickMode} />
        <Segmented options={LOOK_OPTIONS.font} value={settings.font} onChange={(v) => setSetting('font', v)} label="Reading font" />
        <span className="tiny" style={{ opacity: 0.8 }}>You can change these any time in Settings, where you can also see every colour.</span>
      </div>

      <div className="surface stack" style={{ marginTop: 'auto', gap: 10 }}>
        <span style={{ fontWeight: 600 }}>Moving from the old app?</span>
        <span className="small sub" style={{ lineHeight: 1.45 }}>
          In the old app, tap the backup button and download a backup. Choose that file here and everyone comes across, with their prayer points and history.
        </span>
        {message && <span className="small" style={{ color: pending ? '#9FF0C8' : '#FFB4A8' }}>{message}</span>}
        {pending
          ? <button className="btn white" onClick={importAndStart}>Import and begin</button>
          : <button className="btn soft" onClick={() => fileRef.current?.click()}>Import old app backup</button>}
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} hidden />
      </div>
      <button className="btn white" onClick={finish}>{pending ? 'Start fresh instead' : 'Begin'} <span style={{ color: 'var(--acc)', display: 'flex' }}><Next size={18} /></span></button>
      <button className="link" style={{ alignSelf: 'center' }} onClick={() => { setDemo(true); finish(); }}>Look around with sample people first</button>
    </div>
  );
}
