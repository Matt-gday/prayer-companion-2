// Pickers shared by the welcome steps and Settings, so choosing your look
// works the same way on day one and later on.

import { useEffect, useRef } from 'react';
import { SKIES, DAY_SKIES, COLOUR_SKIES, skyMode, skyForDay, skyForTime, nextSkyText } from '../skies.js';
import SkyThumb from './SkyThumb.jsx';

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
export function SkyChooser({ sky, randomPool, onChange, now, currentKey }) {
  const mode = skyMode(sky);
  const pool = randomPool && randomPool.length ? randomPool : COLOUR_SKIES;
  const timeKey = skyForTime(now);
  const todayRandom = skyForDay(pool, now);
  const chosen = SKIES[sky] ? sky : currentKey;
  const carousel = useRef(null);

  // Bring the chosen sky into view in the carousel.
  useEffect(() => {
    if (mode !== 'choose' || !carousel.current) return;
    const el = carousel.current.querySelector('[aria-pressed="true"]');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [mode, chosen]);

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

      {mode === 'choose' && (
        <>
          <div className="sky-preview"><SkyThumb skyKey={chosen} /></div>
          <div className="sky-carousel" ref={carousel}>
            {[...COLOUR_SKIES, ...DAY_SKIES].map((k) => (
              <SkyThumb key={k} skyKey={k} selected={k === chosen} onClick={() => onChange({ sky: k })} />
            ))}
          </div>
        </>
      )}

      <div className="stack" style={{ gap: 8 }}>
        <OptionCard selected={mode === 'time'} onClick={() => onChange({ sky: 'time' })} title="Time of day"
          text={mode === 'time' ? `Now ${SKIES[timeKey].name} · ${nextSkyText(timeKey)}` : 'The sky follows the clock, from sunrise to night'} />
        <OptionCard selected={mode === 'random'} onClick={() => onChange({ sky: 'random' })} title="Random daily"
          text={mode === 'random' ? `Today it’s ${SKIES[todayRandom].name}. Tap a colour to leave it out.` : 'A surprise colour each day'} />
        <OptionCard selected={mode === 'choose'} onClick={() => onChange({ sky: chosen })} title={mode === 'choose' ? `Choose one · ${SKIES[chosen].name}` : 'Choose one'}
          text={mode === 'choose' ? 'Swipe through and tap your favourite' : 'Pick a favourite that stays'} />
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
