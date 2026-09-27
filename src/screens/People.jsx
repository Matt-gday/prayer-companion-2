import { useState } from 'react';
import { useStore } from '../store.jsx';
import { cardName, cardKind, cardMembers, personName, agoText, lastPrayed, PRIORITY_LABEL } from '../model.js';
import { isEveryDay } from '../scheduler.js';
import { TopBar, Avatar } from '../components/ui.jsx';
import { Plus, Search, Users } from '../components/Icons.jsx';

const TYPES = [['all', 'All'], ['people', 'People'], ['group', 'Groups'], ['org', 'Orgs']];
const PRIOS = [['any', 'Any'], ['high', 'High'], ['med', 'Medium'], ['low', 'Low'], ['occ', 'Occas.']];

export default function People({ nav }) {
  const { people, cards, date } = useStore();
  const [type, setType] = useState('all');
  const [prio, setPrio] = useState('any');
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);

  const q = query.trim().toLowerCase();
  const visible = cards.filter((c) => !c.dissolved && !!c.archived === archived && (prio === 'any' || c.priority === prio));
  const archivedCount = cards.filter((c) => c.archived && !c.dissolved).length;

  const matches = (c) => {
    if (!q) return true;
    const names = [cardName(c, people), ...cardMembers(c, people).map((p) => `${personName(p)} ${p.organisation}`)];
    return names.some((n) => n.toLowerCase().includes(q));
  };

  let rows;
  if (type === 'people') {
    rows = visible.flatMap((c) => cardMembers(c, people)
      .filter((p) => !q || `${personName(p)} ${p.organisation}`.toLowerCase().includes(q))
      .map((p) => ({ key: p.id, card: c, name: personName(p), kind: 'person', group: c.isGroup ? c.name : '', sub: c.isGroup ? '' : 'On their own card' })))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    rows = visible
      .filter((c) => (type === 'all' || cardKind(c, people) === type) && matches(c))
      .map((c) => {
        const kind = cardKind(c, people);
        const members = cardMembers(c, people);
        const p = members[0];
        const who = c.isGroup ? members.map((m) => m.firstName || personName(m)).join(', ') + (c.withChildren ? ' and children' : '') : (p && kind === 'person' ? p.organisation : '');
        const when = agoText(lastPrayed(c), date);
        return { key: c.id, card: c, name: cardName(c, people), kind, group: '', sub: [who, when].filter(Boolean).join(' · ') };
      })
      .sort((a, b) => a.name.replace(/^The /, '').localeCompare(b.name.replace(/^The /, '')));
  }

  return (
    <div className="screen">
      <TopBar onBack={() => nav.go('home')} backLabel="Home"
        right={<button className="btn white small" onClick={nav.add}><Plus />Add</button>} />
      <div className="spread" style={{ padding: '0 4px', alignItems: 'baseline' }}>
        <h1 className="title">{archived ? 'Archived' : 'People'}</h1>
        {(archivedCount > 0 || archived) && (
          <button className="small" style={{ minHeight: 36, opacity: 0.85 }} onClick={() => setArchived(!archived)}>
            {archived ? 'Back to everyone' : `Archived (${archivedCount})`}
          </button>
        )}
      </div>
      <label className="row surface" style={{ padding: '0 14px', height: 46, borderRadius: 14, color: 'var(--muted)', gap: 8 }}>
        <Search />
        <input className="grow" style={{ border: 0, background: 'transparent', fontSize: 16, color: 'var(--text)' }} placeholder="Search names, groups, organisations"
          aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="seg on-page" role="group" aria-label="Show">
        {TYPES.map(([k, label]) => <button key={k} aria-pressed={type === k} onClick={() => setType(k)}>{label}</button>)}
      </div>
      <div className="chips" role="group" aria-label="Priority">
        {PRIOS.map(([k, label]) => (
          <button key={k} className="chip" aria-pressed={prio === k} onClick={() => setPrio(k)}>
            <span className={`dot ${k === 'any' ? '' : `dot-${k}`}`} style={k === 'any' ? { background: 'var(--muted)' } : undefined} />{label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="surface empty">
          {cards.length === 0 ? 'Nobody here yet. Tap Add to put in the first person you want to pray for.' : 'Nobody matches that.'}
        </div>
      ) : (
        <div className="list cream">
          {rows.map((r) => (
            <button key={r.key} className="list-row" onClick={() => nav.go('card', { cardId: r.card.id, from: 'people' })}>
              <Avatar kind={r.kind === 'person' && r.card.isGroup && type !== 'people' ? 'group' : r.kind} name={r.name} priority={r.card.priority} />
              <span className="grow stack" style={{ gap: 3 }}>
                <span className={r.kind === 'org' ? 'italic' : ''} style={{ fontSize: 15, fontWeight: 500 }}>{r.name}</span>
                {r.group && <span className="row tiny" style={{ gap: 4, color: 'var(--acc)', fontWeight: 600 }}><Users size={13} />{r.group}</span>}
                {r.sub && <span className="tiny sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</span>}
              </span>
              {isEveryDay(r.card) && <span className="tiny sub">Every day</span>}
              <span className={`dot dot-${r.card.priority}`} style={{ width: 9, height: 9 }} aria-label={`${PRIORITY_LABEL[r.card.priority]} priority`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
