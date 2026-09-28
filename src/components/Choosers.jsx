// Pickers shared by the welcome steps and Settings, so choosing your look
// works the same way on day one and later on.

import { useEffect, useRef, useState } from 'react';
import { SKIES, DAY_SKIES, COLOUR_SKIES, skyMode, skyForDay, skyForTime, nextSkyText } from '../skies.js';
import SkyThumb from './SkyThumb.jsx';
import HomePreview from './HomePreview.jsx';

const SIZES = ['s', 'm', 'l', 'xl'];
const STARTS = { morning: '5am', midday: '10am', afternoon: '2pm', sunset: '5pm', dusk: '6:30pm', night: '8pm' };

function OptionCard({ selected, onClick, title, text, icon, className = '' }) {
  return (
    <button className={`opt-card ${className}`} aria-pressed={selected} onClick={onClick}>
      {icon && <span className="ico">{icon}</span>}
      <span>
        <b>{title}</b>
        {text && <small>{text}</small>}
      </span>
      <span className="radio" />
    </button>
  );
}
export { OptionCard };

// settings: { sky, randomPool }. onChange(patch) updates them.
export function SkyChooser({ sky, randomPool, onChange, now, currentKey, previewName }) {
  const mode = skyMode(sky);
  const pool = randomPool && randomPool.length ? randomPool : COLOUR_SKIES;
  const timeKey = skyForTime(now);
  const todayRandom = skyForDay(pool, now);
  const chosen = SKIES[sky] ? sky : currentKey;

  const togglePool = (k) => {
    const next = pool.includes(k) ? pool.filter((x) => x !== k) : [...pool, k];
    if (next.length) onChange({ randomPool: next });
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      {mode === 'time' && (
        <div className="sky-strip">
          {DAY_SKIES.map((k) => (
            <SkyThumb key={k} skyKey={k} caption={STARTS[k]} selected={k === timeKey} now={k === timeKey} />
          ))}
        </div>
      )}

      {mode === 'random' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
          {COLOUR_SKIES.map((k) => {
            const on = pool.includes(k);
            return (
              <SkyThumb key={k} skyKey={k} caption={SKIES[k].name.split(' ')[0]} selected={k === todayRandom}
                skipped={!on} badge={on ? 'check' : 'off'} onClick={() => togglePool(k)}
                label={`${SKIES[k].name}, ${on ? 'included' : 'left out'}`} />
            );
          })}
        </div>
      )}

      {mode === 'choose' && <PreviewCarousel chosen={chosen} name={previewName} onPick={(k) => onChange({ sky: k })} />}

      <div className="stack" style={{ gap: 8 }}>
        <OptionCard selected={mode === 'time'} onClick={() => onChange({ sky: 'time' })} title="Time of day"
          text={mode === 'time' ? `Now ${SKIES[timeKey].name} · ${nextSkyText(timeKey)}` : 'The sky follows the clock, from sunrise to night'} />
        <OptionCard selected={mode === 'random'} onClick={() => onChange({ sky: 'random' })} title="Random daily"
          text={mode === 'random' ? `Today it’s ${SKIES[todayRandom].name}. Tap a colour to leave it out.` : 'A surprise colour each day'} />
        <OptionCard selected={mode === 'choose'} onClick={() => onChange({ sky: chosen })} title={mode === 'choose' ? `Choose one · ${SKIES[chosen].name}` : 'Choose one'}
          text={mode === 'choose' ? 'Swipe to see each one; the one showing is chosen' : 'Pick a favourite that stays'} />
      </div>
    </div>
  );
}

export function FontCards({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
      <button className="opt-card font-card" aria-pressed={value === 'sans'} onClick={() => onChange('sans')}>
        <span className="aa" style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Aa</span>
        <b>Sans-serif</b><small>Clean and modern</small>
      </button>
      <button className="opt-card font-card" aria-pressed={value === 'serif'} onClick={() => onChange('serif')}>
        <span className="aa" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>Aa</span>
        <b>Serif</b><small>Classic, like a Bible</small>
      </button>
    </div>
  );
}

export function SizeSlider({ value, onChange }) {
  const i = Math.max(0, SIZES.indexOf(value));
  return (
    <div className="size-slider">
      <span style={{ fontSize: 13 }} aria-hidden="true">A</span>
      <input type="range" min="0" max="3" step="1" value={i} aria-label="Text size"
        aria-valuetext={['Small', 'Medium', 'Large', 'Extra large'][i]}
        onChange={(e) => onChange(SIZES[Number(e.target.value)])} />
      <span style={{ fontSize: 22 }} aria-hidden="true">A</span>
    </div>
  );
}

// A little prayer card that shows the chosen font and size.
export function TextPreview() {
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden' }}>
      <div className="pray-head" style={{ padding: '12px 14px' }}>
        <div className="pray-name" style={{ marginTop: 0, fontSize: 'calc(var(--name-size) * 0.8)' }}>Sarah Mitchell</div>
        <div className="pray-meta"><span className="org">Christ Central Church</span></div>
      </div>
      <div className="cream" style={{ padding: '12px 14px' }}>
        <div className="point"><span className="bullet" /><span className="point-text">Wisdom as she starts the new job on Monday</span></div>
      </div>
    </div>
  );
}

const CAROUSEL = [...COLOUR_SKIES, ...DAY_SKIES];
const CARD_W = 200;
const CARD_GAP = 18;

// Swipe through full mini home screens. Whichever one settles in the middle
// is chosen.
function PreviewCarousel({ chosen, name, onPick }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const [shown, setShown] = useState(Math.max(0, CAROUSEL.indexOf(chosen)));

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = Math.max(0, CAROUSEL.indexOf(chosen)) * (CARD_W + CARD_GAP);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = ref.current;
    const i = Math.max(0, Math.min(CAROUSEL.length - 1, Math.round(el.scrollLeft / (CARD_W + CARD_GAP))));
    setShown(i);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (CAROUSEL[i] !== chosen) onPick(CAROUSEL[i]); }, 140);
  };
  const goTo = (i) => ref.current?.scrollTo({ left: i * (CARD_W + CARD_GAP), behavior: 'smooth' });

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div ref={ref} className="preview-carousel" onScroll={onScroll} role="listbox" aria-label="Skies">
        {CAROUSEL.map((k, i) => (
          <button key={k} role="option" aria-selected={i === shown} aria-label={SKIES[k].name} onClick={() => goTo(i)}
            style={{ width: CARD_W, flexShrink: 0, scrollSnapAlign: 'center', opacity: i === shown ? 1 : 0.55, transform: i === shown ? 'none' : 'scale(.92)', transition: 'opacity .2s, transform .2s' }}>
            <HomePreview skyKey={k} name={name} width={CARD_W} />
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 16 }}>{SKIES[CAROUSEL[shown]].name}</div>
      <div className="row" style={{ justifyContent: 'center', gap: 5 }} aria-hidden="true">
        {CAROUSEL.map((k, i) => <span key={k} style={{ width: i === shown ? 16 : 6, height: 6, borderRadius: 3, background: i === shown ? '#fff' : 'rgba(255,255,255,.35)', transition: 'width .2s' }} />)}
      </div>
    </div>
  );
}
