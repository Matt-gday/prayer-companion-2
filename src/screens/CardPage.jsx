import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import {
  cardMembers, cardName, cardKind, personName, isOrg, lastPrayed, agoText, daysBetween,
  formatShortDate, formatMonthYear, everPrayed,
} from '../model.js';
import { TopBar, PriorityPill } from '../components/ui.jsx';
import { isEveryDay } from '../scheduler.js';
import { Check, Clock, Pencil, Chevron } from '../components/Icons.jsx';
import AddPointInline from '../components/AddPointInline.jsx';

const duration = (from, to) => {
  const days = Math.max(1, daysBetween(from, to));
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 70) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
};

const SHOW = 3;

export default function CardPage({ nav, cardId, from }) {
  const { people, cards, date } = useStore();
  const [picked, setPicked] = useState(null);
  const [allAnswered, setAllAnswered] = useState(false);
  const [allPast, setAllPast] = useState(false);
  const card = cards.find((c) => c.id === cardId);
  const backTo = from === 'people' || from === 'pray' ? from : 'home';
  const backLabel = { people: 'People', pray: 'Praying', home: 'Home' }[backTo];
  const back = () => nav.go(backTo);

  if (!card) {
    return <div className="screen"><TopBar onBack={back} backLabel={backLabel} /><div className="surface empty">This card has been deleted.</div></div>;
  }

  const members = cardMembers(card, people);
  const solo = !card.isGroup;
  const person = solo ? members[0] : null;
  const org = solo && person && !isOrg(person) ? person.organisation : '';

  // Every point linked to this card, labelled with whose it is on group cards.
  const allPoints = [
    ...(card.points || []).map((pt) => ({ ...pt, who: '' })),
    ...members.flatMap((p) => (p.points || []).map((pt) => ({ ...pt, who: solo ? '' : p.firstName || personName(p) }))),
  ];
  const current = allPoints.filter((pt) => pt.status === 'active');
  const answered = allPoints.filter((pt) => pt.status === 'answered').sort((a, b) => (a.closed < b.closed ? 1 : -1));
  const prayedDates = [...(card.prayed || []), ...members.flatMap((p) => p.prayed || [])];
  const past = allPoints.filter((pt) => pt.status === 'removed' && everPrayed(pt, prayedDates)).sort((a, b) => (a.closed < b.closed ? 1 : -1));

  const prayed = card.prayed || [];
  const prayedSet = new Set(prayed);
  const added = solo && person ? person.added : card.created;
  const last = lastPrayed(card);
  const onDay = picked && allPoints.filter((pt) => pt.added <= picked && (!pt.closed || pt.closed >= picked));
  const start = [added, prayed[0]].filter(Boolean).sort()[0] || date;

  const who = (pt) => pt.who && <span className="sub" style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 600 }}>{pt.who}: </span>;

  return (
    <div className="screen">
      <TopBar onBack={back} backLabel={backLabel}
        right={<button className="icon-btn glass" onClick={() => nav.edit(card.id)} aria-label="Edit details"><Pencil /></button>} />
      <div className="stack" style={{ padding: '0 4px', gap: 6 }}>
        <span style={{ alignSelf: 'flex-start' }}><PriorityPill priority={card.priority} everyDay={isEveryDay(card)} /></span>
        <h1 className={`title ${cardKind(card, people) === 'org' ? 'italic' : ''}`} style={{ marginTop: 4 }}>{cardName(card, people)}</h1>
        <div className="pray-meta">
          {org && <span className="org">{org}</span>}
          {!solo && <span>{members.map((m) => personName(m)).join(', ')}{card.withChildren ? ' and children' : ''}</span>}
          <span className="when"><Clock />{last ? `Last prayed ${agoText(last, date).toLowerCase()}` : 'Not prayed for yet'}</span>
        </div>
        {card.archived && <span className="tiny" style={{ opacity: 0.8 }}>Archived</span>}
      </div>

      <div className="surface cream stack">
        <span className="label">Praying for now</span>
        {current.length === 0 && <span className="sub small">No prayer points yet.</span>}
        {current.map((pt) => (
          <div key={pt.id} className="point" style={{ '--point-size': '17px' }}>
            <span className="bullet" />
            <span className="point-text" style={{ lineHeight: 1.4 }}>{who(pt)}{pt.text}</span>
          </div>
        ))}
        <AddPointInline target={solo && person ? { kind: 'person', id: person.id } : { kind: 'card', id: card.id }} />
        <button className="spread" style={{ borderTop: '1px solid var(--line)', paddingTop: 10, minHeight: 40, color: 'var(--sub)', fontSize: 14, fontWeight: 600 }}
          onClick={() => nav.points(card.id)}>
          <span>Manage prayer points</span><Chevron />
        </button>
      </div>

      {answered.length > 0 && (
        <div className="surface cream stack">
          <span className="label">Answered</span>
          {(allAnswered ? answered : answered.slice(0, SHOW)).map((pt) => (
            <div key={pt.id} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="solid-low" style={{ width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Check size={13} /></span>
              <span className="stack" style={{ gap: 2 }}>
                <span className="read" style={{ fontSize: 17, lineHeight: 1.35 }}>{who(pt)}{pt.text}</span>
                {pt.note && <span className="answered-note">{pt.note}</span>}
                <span className="tiny sub">Prayed for {duration(pt.added, pt.closed)} · answered {formatShortDate(pt.closed)}</span>
              </span>
            </div>
          ))}
          {answered.length > SHOW && (
            <button className="link" style={{ alignSelf: 'flex-start', fontSize: 14 }} onClick={() => setAllAnswered(!allAnswered)}>
              {allAnswered ? 'Show fewer' : `Show all ${answered.length} answered`}
            </button>
          )}
        </div>
      )}

      <div className="surface cream stack" style={{ gap: 14 }}>
        <span className="label">History</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <Stat big={prayed.length} small={prayed.length === 1 ? 'time prayed' : 'times prayed'} />
          <Stat big={last ? agoText(last, date) : 'Never'} small="last prayed" />
          <Stat big={formatMonthYear(added)} small="added" />
        </div>
        <MonthCalendar start={start} end={date} prayedSet={prayedSet} picked={picked} onPick={setPicked} />
        <div className="row tiny sub" style={{ gap: 16 }}>
          <span className="row" style={{ gap: 6 }}><span className="day on" style={{ width: 12, height: 12, borderRadius: 4 }} />Prayed</span>
          <span className="row" style={{ gap: 6 }}><span className="day" style={{ width: 12, height: 12, borderRadius: 4 }} />Not prayed</span>
        </div>
        {picked && (
          <div className="stack" style={{ gap: 4, background: 'var(--panel)', borderRadius: 12, padding: 12 }}>
            <span className="small" style={{ fontWeight: 600 }}>{formatShortDate(picked)} · {prayedSet.has(picked) ? 'prayed' : 'not prayed'}</span>
            {onDay.length === 0 && <span className="small sub">No prayer points then.</span>}
            {onDay.map((pt) => <span key={pt.id} className="small">{pt.who ? `${pt.who}: ` : ''}{pt.text}</span>)}
          </div>
        )}
        {past.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="label">Past prayer points</span>
            {(allPast ? past : past.slice(0, SHOW)).map((pt) => (
              <span key={pt.id} className="small">
                {pt.who ? `${pt.who}: ` : ''}{pt.text} <span className="tiny sub">· {formatMonthYear(pt.added)} to {formatMonthYear(pt.closed)}</span>
              </span>
            ))}
            {past.length > SHOW && (
              <button className="link" style={{ alignSelf: 'flex-start', fontSize: 14 }} onClick={() => setAllPast(!allPast)}>
                {allPast ? 'Show fewer' : `Show all ${past.length} past points`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// One small calendar per month, side by side, oldest on the left and
// scrolled to the newest. Tap a day to see what you were praying for.
function MonthCalendar({ start, end, prayedSet, picked, onPick }) {
  const scroller = useRef(null);
  const months = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push([y, m]);
    m += 1;
    if (m === 13) { m = 1; y += 1; }
  }
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [months.length]);
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="tiny sub">
        Tap a day to see what you were praying for{months.length > 1 ? ' · swipe sideways for earlier months' : ''}
      </span>
      <div ref={scroller} className="month-scroller">
        {months.map(([yy, mm]) => {
          const first = new Date(yy, mm - 1, 1);
          const count = new Date(yy, mm, 0).getDate();
          const offset = (first.getDay() + 6) % 7; // Monday first
          const days = Array.from({ length: count }, (_, i) => `${yy}-${pad(mm)}-${pad(i + 1)}`);
          const prayedCount = days.filter((d) => prayedSet.has(d)).length;
          const label = first.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
          return (
            <div key={`${yy}-${mm}`} className="stack" style={{ gap: 8, flexShrink: 0, scrollSnapAlign: 'end' }}>
              <div className="stack" style={{ gap: 1 }}>
                <span className="small" style={{ fontWeight: 600 }}>{label}</span>
                <span className="sub tiny">{prayedCount ? `Prayed ${prayedCount} day${prayedCount === 1 ? '' : 's'}` : 'Not prayed'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 22px)', gridAutoRows: '22px', gap: 5 }} role="group" aria-label={label}>
                {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} />)}
                {days.map((d) => {
                  const on = prayedSet.has(d);
                  const future = d > end;
                  return (
                    <button key={d} disabled={future} onClick={() => onPick(picked === d ? null : d)}
                      aria-label={`${formatShortDate(d)}${on ? ', prayed' : ''}`} aria-pressed={picked === d}
                      className={`day ${on ? 'on' : ''} ${picked === d ? 'picked' : ''}`} style={{ opacity: future ? 0.35 : 1 }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Stat = ({ big, small }) => (
  <div className="stack" style={{ gap: 2 }}>
    <span style={{ fontSize: 18, fontWeight: 600 }}>{big}</span>
    <span className="tiny sub">{small}</span>
  </div>
);
