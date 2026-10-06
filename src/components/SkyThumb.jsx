import { SKIES } from '../skies.js';

// A tiny home screen in a given sky, used to choose colours in Settings.
export default function SkyThumb({ skyKey, selected, skipped, badge, now, caption, sub, onClick, label }) {
  const sky = SKIES[skyKey];
  const ink = sky.light ? '#3D352C' : '#fff';
  const faint = sky.light ? 'rgba(90,70,50,.3)' : 'rgba(255,255,255,.7)';
  const inner = (
    <>
      <span className={`thumb ${selected ? 'selected' : ''} ${skipped ? 'skipped' : ''}`}>
        <span style={{ position: 'absolute', inset: 0, background: sky.bg }} />
        {sky.stars && <span className="sky-stars" style={{ position: 'absolute', inset: 0, opacity: 0.55 }} />}
        {sky.sun && (
          <span style={{ position: 'absolute', left: '50%', bottom: '2%', width: '110%', aspectRatio: '1', transform: 'translateX(-50%)', borderRadius: '50%', opacity: 0.8,
            background: 'radial-gradient(circle, #FFFDF0 0%, #FFE9A8 18%, rgba(255,196,110,.5) 36%, rgba(255,170,110,0) 68%)' }} />
        )}
        <span style={{ position: 'absolute', inset: 0, padding: '10px 8px 8px', display: 'flex', flexDirection: 'column', gap: 5, color: ink }}>
          <span style={{ width: '40%', height: 4, borderRadius: 2, background: faint }} />
          <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 11, lineHeight: 1 }}>Welcome</span>
          <span style={{ alignSelf: 'center', width: '42%', aspectRatio: '1', borderRadius: '50%', marginTop: 5, border: `4px solid ${sky.light ? 'rgba(184,122,74,.18)' : 'rgba(255,255,255,.28)'}`, borderTopColor: sky.ring, borderRightColor: sky.ring }} />
          <span style={{ marginTop: 'auto', height: 12, borderRadius: 5, background: sky.light ? 'linear-gradient(135deg,#D49A5A,#A66830)' : '#fff' }} />
          <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <span style={{ height: 9, borderRadius: 4, background: sky.glass || 'rgba(40,24,50,.3)' }} />
            <span style={{ height: 9, borderRadius: 4, background: sky.glass || 'rgba(40,24,50,.3)' }} />
          </span>
        </span>
        {now && <span className="thumb-now">NOW</span>}
        {badge === 'check' && <span className="thumb-badge">✓</span>}
        {badge === 'off' && <span className="thumb-badge" style={{ background: 'rgba(255,255,255,.4)', color: '#fff' }}>–</span>}
      </span>
      <span className="thumb-cap">{caption || sky.name}{sub && <small>{sub}</small>}</span>
    </>
  );
  if (!onClick) return <span style={{ display: 'block' }}>{inner}</span>;
  return <button onClick={onClick} aria-pressed={!!selected} aria-label={label || sky.name} style={{ display: 'block', width: '100%', textAlign: 'center' }}>{inner}</button>;
}
