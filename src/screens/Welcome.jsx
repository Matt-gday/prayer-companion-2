import { useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { Back, Next } from '../components/Icons.jsx';
import { SkyChooser, FontCards, SizeSlider, TextPreview } from '../components/Choosers.jsx';
import { scrollToTop } from '../scroll.js';

const STEPS = 4;

// First open: four full-screen steps. Name, sky, text, then bringing people
// across from the old app.
export default function Welcome({ skyKey, now }) {
  const { settings, setSetting, readBackup, restoreBackup } = useStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(settings.name);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(null);
  const fileRef = useRef(null);

  const next = () => { setStep((s) => Math.min(STEPS, s + 1)); scrollToTop(); };
  const back = () => { setStep((s) => Math.max(1, s - 1)); scrollToTop(); };

  const begin = () => {
    if (pending) restoreBackup(pending);
    setSetting('name', (name.trim() || pending?.userName || '').trim());
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
        setMessage(`Found ${restored.cards.filter((c) => !c.archived).length} cards and ${restored.people.length} people. Tap Begin to bring them in.`);
        if (!name.trim() && restored.userName) setName(restored.userName);
      } catch {
        setPending(null);
        setMessage('That file isn’t a Prayer Companion backup. Choose the .json file you downloaded from the old app.');
      }
    };
    reader.readAsText(file);
  };

  const dots = (
    <div className="step-dots" aria-label={`Step ${step} of ${STEPS}`}>
      {Array.from({ length: STEPS }, (_, i) => <i key={i} className={i + 1 === step ? 'on' : ''} />)}
    </div>
  );
  const backLink = <button className="back" style={{ alignSelf: 'flex-start', height: 36 }} onClick={back}><Back />Back</button>;
  const cont = (label = 'Continue', onClick = next) => (
    <button className="continue" onClick={onClick}>{label}<span className="arrow"><Next size={20} /></span></button>
  );

  if (step === 1) {
    return (
      <div className="screen" style={{ paddingTop: 'var(--top-gap)' }}>
        {dots}
        <div style={{ flex: 1 }} />
        <img className="app-icon" src="./apple-touch-icon.png" alt="" style={{ alignSelf: 'center' }} />
        <h1 className="big-title" style={{ textAlign: 'center', marginTop: 10 }}>Welcome to<br />Prayer Companion</h1>
        <p style={{ textAlign: 'center', lineHeight: 1.5, opacity: 0.88, fontSize: 16 }}>A simple way to keep praying for the people in your life each day.</p>
        {/* The name sits with the welcome, near the middle, big and centred. */}
        <label className="field" style={{ fontSize: 15, color: 'rgba(255,255,255,.9)', textAlign: 'center', marginTop: 18, gap: 14 }}>What should we call you?
          <input className="input feature" style={{ height: 64, fontSize: 26, fontWeight: 600, textAlign: 'center', borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.35)', background: 'rgba(255,255,255,.12)', color: '#fff' }}
            placeholder="Your first name" autoComplete="given-name"
            value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') next(); }} />
        </label>
        <div style={{ flex: 1.3 }} />
        {cont()}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="screen" style={{ paddingTop: 'var(--top-gap)' }}>
        {dots}
        {backLink}
        <h1 className="big-title" style={{ fontSize: 30 }}>Pick your sky</h1>
        <p style={{ opacity: 0.85, lineHeight: 1.45, marginTop: -6 }}>The colour behind everything in the app.</p>
        <SkyChooser sky={settings.sky} randomPool={settings.randomPool} now={now} currentKey={skyKey} previewName={name.trim()}
          onChange={(patch) => Object.entries(patch).forEach(([k, v]) => setSetting(k, v))} />
        <div style={{ flex: 1 }} />
        {cont()}
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="screen" style={{ paddingTop: 'var(--top-gap)' }}>
        {dots}
        {backLink}
        <h1 className="big-title" style={{ fontSize: 30 }}>Make it easy to read</h1>
        <FontCards value={settings.font} onChange={(v) => setSetting('font', v)} />
        <span className="small" style={{ opacity: 0.88, marginTop: 4 }}>Text size</span>
        <SizeSlider value={settings.size} onChange={(v) => setSetting('size', v)} />
        <TextPreview />
        <p className="small" style={{ opacity: 0.8, lineHeight: 1.45 }}>Text size changes the whole app. You can change these any time in Settings.</p>
        <div style={{ flex: 1 }} />
        {cont()}
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingTop: 'var(--top-gap)' }}>
      {dots}
      {backLink}
      <h1 className="big-title" style={{ fontSize: 30 }}>Bring your people across</h1>
      <p style={{ opacity: 0.88, lineHeight: 1.5, marginTop: -4 }}>Already using the old Prayer Companion? Everyone comes across, with their prayer points and history.</p>
      <div className="surface stack" style={{ gap: 14 }}>
        {['Open the old app and tap the ⇅ backup button', 'Tap Download Backup and save the file', 'Tap Import below and choose that file'].map((t, i) => (
          <div key={t} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: 13, background: '#fff', color: '#14203F', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ lineHeight: 1.45, paddingTop: 3 }}>{t}</span>
          </div>
        ))}
      </div>
      <button className="btn soft" style={{ background: 'rgba(255,255,255,.18)' }} onClick={() => fileRef.current?.click()}>
        {pending ? 'Choose a different file' : 'Import old app backup'}
      </button>
      <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} hidden />
      {message && <div className="small" style={{ textAlign: 'center', lineHeight: 1.45, color: pending ? '#A6F5D6' : '#FFC2B8' }}>{pending ? '✓ ' : ''}{message}</div>}
      <div style={{ flex: 1 }} />
      {cont('Begin', begin)}
      <div className="tiny" style={{ textAlign: 'center', opacity: 0.78 }}>{pending ? '' : 'New to the app? Just tap Begin.'}</div>
    </div>
  );
}
