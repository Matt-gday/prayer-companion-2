import { useStore } from '../store.jsx';
import { cardMembers, cardName, personName, formatShortDate, formatMonthYear, everPrayed } from '../model.js';
import { TopBar } from '../components/ui.jsx';
import PointEditor from '../components/PointEditor.jsx';
import { Check } from '../components/Icons.jsx';
import { backFrom } from './Details.jsx';

// Every prayer point for a card in one scrolling page: edit, reorder, mark
// answered or delete; then every answered and past point, with "Pray again".
export default function PrayerPoints({ nav, cardId, from, cardFrom }) {
  const { people, cards, addPoint, setPointStatus, showToast } = useStore();
  const card = cards.find((c) => c.id === cardId);
  const back = backFrom(nav, { cardId, from, cardFrom });

  if (!card) {
    return <div className="screen"><TopBar onBack={back} /><div className="surface empty">This card has been deleted.</div></div>;
  }
  const members = cardMembers(card, people);
  const solo = !card.isGroup;
  const person = solo ? members[0] : null;
  const name = cardName(card, people);
  const backLabel = from === 'card' ? (solo && person?.firstName) || name : from === 'pray' ? 'Praying' : 'Back';
  const first = (p) => p.firstName || personName(p);

  // Each place points can live, with a heading.
  const sections = solo && person
    ? [{ key: person.id, title: 'Praying for now', target: { kind: 'person', id: person.id }, points: person.points || [], placeholder: 'Add a prayer point' }]
    : [
      { key: card.id, title: /family/i.test(card.name) ? 'The whole family' : 'The whole group', target: { kind: 'card', id: card.id }, points: card.points || [], placeholder: 'Add a point for everyone' },
      ...members
        .filter((p) => !p.isChild || (p.points || []).some((pt) => pt.status === 'active'))
        .map((p) => ({ key: p.id, title: first(p), target: { kind: 'person', id: p.id }, points: p.points || [], placeholder: `Add a point for ${first(p)}` })),
    ];

  const closed = (status) => sections
    .flatMap((s) => s.points.filter((pt) => pt.status === status).map((pt) => ({ ...pt, section: s })))
    .sort((a, b) => (a.closed < b.closed ? 1 : -1));
  const answered = closed('answered');
  const dates = [...(card.prayed || []), ...members.flatMap((p) => p.prayed || [])];
  const past = closed('removed').filter((pt) => everPrayed(pt, dates));
  const label = (pt) => !solo && <span className="sub" style={{ fontSize: 13, fontWeight: 600 }}>{pt.section.title.replace(/^The whole /, '').replace(/^./, (c) => c.toUpperCase())}: </span>;

  // Answered points keep their record, so praying again starts a fresh copy.
  // A deleted point simply comes back.
  const againAnswered = (pt) => { addPoint(pt.section.target, pt.text); showToast('Back in Praying for now'); };
  const againPast = (pt) => { setPointStatus(pt.section.target, pt.id, 'active'); showToast('Back in Praying for now'); };
  const again = (onClick) => (
    <button className="chip-btn" style={{ flexShrink: 0 }} onClick={onClick}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" /></svg>
      Pray again
    </button>
  );

  return (
    <div className="screen">
      <TopBar onBack={back} backLabel={backLabel} right={<span className="small" style={{ fontWeight: 600, marginRight: 4 }}>Prayer points</span>} />

      {sections.map((s) => (
        <div key={s.key} className="surface cream">
          <PointEditor target={s.target} points={s.points} placeholder={s.placeholder}
            label={s.points.filter((pt) => pt.status === 'active').length > 1 ? `${s.title} · drag to reorder` : s.title} />
        </div>
      ))}

      {answered.length > 0 && (
        <div className="surface cream stack">
          <span className="label">Answered · {answered.length}</span>
          {answered.map((pt) => (
            <div key={pt.id} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="solid-low" style={{ width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Check size={13} /></span>
              <span className="grow stack" style={{ gap: 2 }}>
                <span className="read" style={{ fontSize: 16, lineHeight: 1.35 }}>{label(pt)}{pt.text}</span>
                <span className="tiny sub">Answered {formatShortDate(pt.closed)}</span>
              </span>
              {again(() => againAnswered(pt))}
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="surface cream stack">
          <span className="label">Past · {past.length}</span>
          {past.map((pt) => (
            <div key={pt.id} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span className="grow stack" style={{ gap: 2 }}>
                <span style={{ fontSize: 15, lineHeight: 1.35, color: 'var(--sub)' }}>{label(pt)}{pt.text}</span>
                <span className="tiny sub">{formatMonthYear(pt.added)} to {formatMonthYear(pt.closed)}</span>
              </span>
              {again(() => againPast(pt))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
