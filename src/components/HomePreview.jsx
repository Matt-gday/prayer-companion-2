import { SKIES, DEFAULT_GLASS, edgeFade } from '../skies.js';
import { Users, List, Download, Next } from './Icons.jsx';

const W = 390;
// A few fixed specks, like the sparkles on the real Home screen.
const SPECKS = Array.from({ length: 26 }, (_, i) => [(i * 137.5) % 100, (i * 61.8 + 7) % 100, 0.8 + ((i * 7) % 10) / 10, 0.35 + ((i * 3) % 5) / 10]);
const H = 844;

// A faithful miniature of the Home screen in a given sky, drawn at full
// phone size and scaled down to fit.
export default function HomePreview({ skyKey, name, width = 170 }) {
  const sky = SKIES[skyKey];
  const glass = sky.glass || DEFAULT_GLASS;
  const scale = width / W;
  const R = 88;
  const C = 2 * Math.PI * R;
  const dots = [['var(--high)', 'High 6'], ['var(--med)', 'Medium 5'], ['var(--low)', 'Low 3'], ['var(--occ)', 'Occasional 1']];

  return (
    <div aria-hidden="true" style={{ width, height: H * scale, borderRadius: 26, overflow: 'hidden', boxShadow: '0 16px 38px rgba(0,0,0,.38)', position: 'relative', flexShrink: 0 }}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ position: 'absolute', inset: 0, background: sky.bg }} />
        <div style={{ position: 'absolute', inset: 0, background: edgeFade('44px', '60px') }} />
        {sky.stars && <div className="sky-stars" style={{ position: 'absolute', inset: 0 }} />}
        {sky.sun && (
          <>
            <div className="sky-rays" style={{ position: 'absolute', top: 0, bottom: 0 }} />
            <div style={{ position: 'absolute', left: '50%', bottom: '4%', width: 340, height: 340, transform: 'translateX(-50%)', borderRadius: '50%',
              background: 'radial-gradient(circle, #FFFDF0 0%, #FFF1BE 14%, #FFD98A 24%, rgba(255,196,110,.55) 38%, rgba(255,170,110,.18) 55%, rgba(255,170,110,0) 70%)' }} />
          </>
        )}
        {SPECKS.map(([x, y, r, a], i) => (
          <span key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2, borderRadius: '50%', background: `rgba(255,255,255,${a})` }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, padding: '58px 18px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 17, fontWeight: 500 }}>
            <span>Monday 28 September</span>
            <span style={{ width: 44, height: 44, borderRadius: 22, background: glass }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 19, opacity: 0.92 }}>Good morning,</div>
            <div style={{ fontSize: 58, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{name || 'Friend'}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 220, height: 220, position: 'relative' }}>
            <svg width="220" height="220" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={R} fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.26)" strokeWidth="13" />
              <circle cx="100" cy="100" r={R} fill="none" stroke={sky.ring} strokeWidth="13" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - 7 / 15)} transform="rotate(-90 100 100)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 62, fontWeight: 600, lineHeight: 1 }}>7</span>
              <span style={{ fontSize: 14, opacity: 0.9 }}>of 15 prayed</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7 }}>
            {dots.map(([c, t]) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, padding: '5px 12px 5px 10px', borderRadius: 99, background: glass }}>
                <span style={{ width: 9, height: 9, borderRadius: 5, background: c, boxShadow: '0 0 0 1.5px rgba(255,255,255,.6)' }} />{t}
              </span>
            ))}
          </div>
          </div>
          <div style={{ height: 78, borderRadius: 24, background: '#fff', color: '#2A2140', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px 0 22px', boxShadow: '0 10px 26px rgba(40,20,60,.18)' }}>
            <span>
              <span style={{ fontSize: 19, fontWeight: 600, display: 'block' }}>Continue praying</span>
              <span style={{ fontSize: 14, color: '#7A6A80' }}>Next: Sarah Mitchell</span>
            </span>
            <span style={{ width: 56, height: 56, borderRadius: 28, background: sky.go, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Next size={22} /></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[[Users, 'People', '46 cards'], [List, 'Lists', '2 lists'], [Download, 'Backup', '3 days ago']].map(([Icon, t, sub]) => (
              <div key={t} style={{ borderRadius: 18, padding: '12px 6px', background: glass, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600 }}>
                <Icon size={22} />
                {t}
                <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: -2 }}>{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
