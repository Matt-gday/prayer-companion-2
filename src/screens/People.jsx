import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { cardName, cardKind, cardMembers, personName, agoText, lastPrayed, PRIORITY_LABEL } from '../model.js';
import { isEveryDay } from '../scheduler.js';
import { TopBar, Avatar } from '../components/ui.jsx';
import { Plus, Search, Users, Check } from '../components/Icons.jsx';

const TYPES = [['all', 'All'], ['people', 'People'], ['group', 'Groups'], ['org', 'Orgs']];
const PRIOS = [['any', 'Any'], ['high', 'High'], ['med', 'Med'], ['low', 'Low'], ['occ', 'Occas.']];
// The filters you last used, kept while the app is open, so coming back from
// someone's page doesn't reset them.
const remembered = { type: 'all', prio: 'any', query: '', archived: false };

const SORTS = [['first', 'First name'], ['last', 'Last name'], ['prayed', 'Last prayed']];

const noThe = (name) => name.replace(/^the\s+/i, '');
// The surname a family or group files under: "The Mitchell family" → Mitchell,
// or the surname everyone in it shares.
const groupSurname = (card, members) => {
  const m = card.name.match(/^the\s+(.+?)\s+(family|household)$/i);
  if (m) return m[1];
  const last = [...new Set(members.map((p) => p.lastName).filter(Boolean))];
  return last.length === 1 ? last[0] : noThe(card.name);
};

// Show a name with the part it's sorted by in bold.
const Bolded = ({ name, part }) => {
  const i = part ? name.toLowerCase().indexOf(part.toLowerCase()) : -1;
  if (i < 0) return name;
  return <>{name.slice(0, i)}<b style={{ fontWeight: 650 }}>{name.slice(i, i + part.length)}</b>{name.slice(i + part.length)}</>;
};

function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sort-btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M17 20V4M13.5 7.5L17 4l3.5 3.5" /></svg>
        {SORTS.find(([k]) => k === value)[1]}
      </button>
      {open && (
        <div className="sort-menu" role="menu">
          <span className="tiny sub" style={{ padding: '8px 14px 4px' }}>Sort by</span>
          {SORTS.map(([k, label]) => (
            <button key={k} role="menuitemradio" aria-checked={value === k} onClick={() => { onChange(k); setOpen(false); }}>
              <span className="stack" style={{ gap: 1, textAlign: 'left' }}>
                {label}
                {k === 'prayed' && <span className="tiny sub">Longest ago first</span>}
              </span>
              {value === k && <span style={{ color: 'var(--acc)', display: 'flex' }}><Check size={16} /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function People({ nav }) {
  const { people, cards, date, settings, setSetting } = useStore();
  const sort = settings.peopleSort || 'first';
  const [type, setType] = useState(remembered.type);
  const [prio, setPrio] = useState(remembered.prio);
  const [query, setQuery] = useState(remembered.query);
  const [archived, setArchived] = useState(remembered.archived);
  useEffect(() => { Object.assign(remembered, { type, prio, query, archived }); }, [type, prio, query, archived]);

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
      .map((p) => ({ key: p.id, card: c, name: personName(p), kind: 'person', group: c.isGroup ? c.name : '', sub: c.isGroup ? '' : 'On their own card',
        first: personName(p), last: p.lastName ? `${p.lastName} ${p.firstName}` : personName(p), lastPart: p.lastName })));
  } else {
    rows = visible
      .filter((c) => (type === 'all' || cardKind(c, people) === type) && matches(c))
      .map((c) => {
        const kind = cardKind(c, people);
        const members = cardMembers(c, people);
        const p = members[0];
        const who = c.isGroup ? members.map((m) => m.firstName || personName(m)).join(', ') + (c.withChildren ? ' and children' : '') : (p && kind === 'person' ? p.organisation : '');
        const when = agoText(lastPrayed(c), date);
        const name = cardName(c, people);
        const lastPart = kind === 'org' ? '' : c.isGroup ? groupSurname(c, members) : p?.lastName || '';
        const last = kind === 'person' && !c.isGroup && p?.lastName ? `${p.lastName} ${p.firstName}` : lastPart || noThe(name);
        return { key: c.id, card: c, name, kind, group: '', sub: [who, when].filter(Boolean).join(' · '), first: noThe(name), last, lastPart };
      });
  }

  // Sort.
  const byName = (key) => (a, b) => a[key].localeCompare(b[key], undefined, { sensitivity: 'base' });
  if (sort === 'prayed') {
    rows.sort((a, b) => (lastPrayed(a.card) || '').localeCompare(lastPrayed(b.card) || '') || byName('first')(a, b));
  } else {
    rows.sort(byName(sort));
  }


  return (
    <div className="screen">
      <TopBar onBack={() => nav.go('home')} backLabel="Home"
        right={<button className="btn white small" onClick={nav.add}><Plus />Add</button>} />
      <div className="spread" style={{ padding: '0 4px', alignItems: 'baseline' }}>
        <h1 className="title">{archived ? 'Archived' : 'People'}</h1>
        <span className="row" style={{ gap: 10 }}>
          {(archivedCount > 0 || archived) && (
            <button className="small" style={{ minHeight: 36, opacity: 0.85 }} onClick={() => setArchived(!archived)}>
              {archived ? 'Back to everyone' : `Archived (${archivedCount})`}
            </button>
          )}
          <SortMenu value={sort} onChange={(v) => setSetting('peopleSort', v)} />
        </span>
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
                <span className={r.kind === 'org' ? 'italic' : ''} style={{ fontSize: 15, fontWeight: sort === 'last' && r.lastPart ? 400 : 500 }}>{sort === 'last' ? <Bolded name={r.name} part={r.lastPart} /> : r.name}</span>
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
