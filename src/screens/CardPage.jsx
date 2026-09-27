import { useState } from 'react';
import { useStore } from '../store.jsx';
import {
  cardMembers, cardName, cardKind, personName, isOrg, lastPrayed, agoText, addDays, daysBetween,
  formatShortDate, formatMonthYear,
} from '../model.js';
import { TopBar, PriorityPill } from '../components/ui.jsx';
import { isEveryDay } from '../scheduler.js';
import { Check } from '../components/Icons.jsx';

const duration = (from, to) => {
  const days = Math.max(1, daysBetween(from, to));
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 70) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
};

export default function CardPage({ nav, cardId, from }) {
  const { people, cards, date } = useStore();
  const [picked, setPicked] = useState(null);
  const card = cards.find((c) => c.id === cardId);
  const backTo = from === 'people' || from === 'pray' ? from : 'home';
  const backLabel = { people: 'People', pray: 'Praying', home: 'Home' }[backTo];
  const back = () => nav.go(backTo);

  if (!card) {
    return <div className="screen"><TopBar onBack={back} backLabel={backLabel} /><div className="empty">This card has been deleted.</div></div>;
  }

  const members = cardMembers(card, people);
  const solo = !card.isGroup;
  const person = solo ? members[0] : null;

  // Every point linked to this card, labelled with whose it is on group cards.
  const allPoints = [
    ...(card.points || []).map((pt) => ({ ...pt, who: '' })),
    ...members.flatMap((p) => (p.points || []).map((pt) => ({ ...pt, who: solo ? '' : p.firstName || personName(p) }))),
  ];
  const current = allPoints.filter((pt) => pt.status === 'active');
  const answered = allPoints.filter((pt) => pt.status === 'answered').sort((a, b) => (a.closed < b.closed ? 1 : -1));
  const past = allPoints.filter((pt) => pt.status === 'removed').sort((a, b) => (a.closed < b.closed ? 1 : -1));

  const prayed = card.prayed || [];
  const prayedSet = new Set(prayed);
  const added = solo && person ? person.added : card.created;

  // Twelve weeks of days, oldest first, ending today.
  const days = Array.from({ length: 84 }, (_, i) => addDays(date, i - 83));
  const onDay = picked && allPoints.filter((pt) => pt.added <= picked && (!pt.closed || pt.closed >= picked));

  return (
    <div className="screen">
      <TopBar onBack={back} backLabel={backLabel}
        right={<button className="link" onClick={() => nav.edit(card.id)}>Edit</button>} />
      <div className="stack" style={{ padding: '0 4px', gap: 6 }}>
        <span style={{ alignSelf: 'flex-start' }}><PriorityPill priority={card.priority} everyDay={isEveryDay(card)} /></span>
        <h1 className={`title ${cardKind(card, people) === 'org' ? 'italic' : ''}`} style={{ marginTop: 4 }}>{cardName(card, people)}</h1>
        {solo && person && !isOrg(person) && person.organisation && <span className="sub">{person.organisation}</span>}
        {!solo && <span className="sub">{members.map((m) => personName(m)).join(', ')}{card.withChildren ? ' and children' : ''}</span>}
        {card.archived && <span className="tiny muted">Archived</span>}
      </div>

      <div className="surface stack">
        <span className="label">Praying for now</span>
        {current.length === 0 && <span className="sub small">No prayer points yet. Tap Edit to add some.</span>}
        {current.map((pt) => (
          <span key={pt.id} className="read" style={{ fontSize: 17, lineHeight: 1.4 }}>
            {pt.who && <span className="sub" style={{ fontFamily: 'var(--ui)', fontSize: 13, fontWeight: 500 }}>{pt.who}: </span>}{pt.text}
          </span>
        ))}
      </div>

      {answered.length > 0 && (
        <div className="surface stack">
          <span className="label">Answered</span>
          {answered.map((pt) => (
            <div key={pt.id} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="pill-low" style={{ width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Check size={13} /></span>
              <span className="stack" style={{ gap: 2 }}>
                <span className="read" style={{ fontSize: 17, lineHeight: 1.35 }}>{pt.who && <span className="sub" style={{ fontFamily: 'var(--ui)', fontSize: 13 }}>{pt.who}: </span>}{pt.text}</span>
                <span className="tiny muted">Prayed for {duration(pt.added, pt.closed)} · answered {formatShortDate(pt.closed)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="surface stack" style={{ gap: 14 }}>
        <span className="label">History</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <Stat big={prayed.length} small={prayed.length === 1 ? 'time prayed' : 'times prayed'} />
          <Stat big={lastPrayed(card) ? agoText(lastPrayed(card), date) : 'Never'} small="last prayed" />
          <Stat big={formatMonthYear(added)} small="added" />
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="dots" role="group" aria-label="Last 12 weeks">
            {days.map((d) => (
              <button key={d} className={prayedSet.has(d) ? 'on' : ''} aria-label={`${formatShortDate(d)}${prayedSet.has(d) ? ', prayed' : ''}`}
                onClick={() => setPicked(picked === d ? null : d)}
                style={picked === d ? { outline: '2px solid var(--text)', outlineOffset: 1, width: 11, height: 11, borderRadius: 3 } : { width: 11, height: 11, borderRadius: 3, background: prayedSet.has(d) ? 'var(--acc)' : 'var(--soft)' }} />
            ))}
          </div>
          <span className="tiny muted">Last 12 weeks · tap a day to see what you were praying for</span>
          {picked && (
            <div className="stack" style={{ gap: 4, background: 'var(--soft)', borderRadius: 12, padding: 12 }}>
              <span className="small" style={{ fontWeight: 600 }}>{formatShortDate(picked)} · {prayedSet.has(picked) ? 'prayed' : 'not prayed'}</span>
              {onDay.length === 0 && <span className="small sub">No prayer points then.</span>}
              {onDay.map((pt) => <span key={pt.id} className="small">{pt.who ? `${pt.who}: ` : ''}{pt.text}</span>)}
            </div>
          )}
        </div>
        {past.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="label">Past prayer points</span>
            {past.map((pt) => (
              <span key={pt.id} className="small">
                {pt.who ? `${pt.who}: ` : ''}{pt.text} <span className="muted tiny">· {formatMonthYear(pt.added)} to {formatMonthYear(pt.closed)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Stat = ({ big, small }) => (
  <div className="stack" style={{ gap: 2 }}>
    <span style={{ fontSize: 19, fontWeight: 600 }}>{big}</span>
    <span className="tiny sub">{small}</span>
  </div>
);
