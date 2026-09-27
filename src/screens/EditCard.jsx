import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { cardMembers, personName, cardName, isPrayable } from '../model.js';
import { estimateIntervals, describeInterval, everyDayCheck } from '../scheduler.js';
import { Sheet, PriorityPicker, Switch, useConfirm } from '../components/ui.jsx';
import PointEditor from '../components/PointEditor.jsx';
import { Chevron, Plus, Close } from '../components/Icons.jsx';

export default function EditCard({ cardId, nav, onClose }) {
  const store = useStore();
  const { people, cards, settings, date, updateCard, updatePerson, setArchived, deleteCard, splitGroup } = store;
  const [ask, confirmNode] = useConfirm();
  const [openMember, setOpenMember] = useState(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const card = cards.find((c) => c.id === cardId);

  const estimates = useMemo(
    () => (card ? estimateIntervals(cards, people, settings.limit, date) : {}),
    // Only recalculate when priorities or the limit change, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards.map((c) => `${c.id}${c.priority}${c.everyDay ? 1 : 0}${c.archived ? 1 : 0}`).join(), settings.limit]
  );

  if (!card) return null;
  const members = cardMembers(card, people);
  const solo = !card.isGroup;
  const person = solo ? members[0] : null;
  const everyDay = everyDayCheck(cards, people, settings.limit);

  const confirmDelete = () => ask({
    title: `Delete ${cardName(card, people)}?`,
    message: solo
      ? 'This removes them and all their prayer history. To keep the history, archive them instead.'
      : 'This removes the group and everyone in it, with their prayer history. To keep people, split the group instead.',
    confirmLabel: 'Delete',
    danger: true,
    onConfirm: () => { onClose(); deleteCard(card.id); },
  });

  const confirmSplit = () => ask({
    title: 'Split into individual cards?',
    message: 'Everyone in this group gets their own card with the same priority. Their prayer history stays with them.',
    confirmLabel: 'Split',
    onConfirm: () => { onClose(); splitGroup(card.id); },
  });

  return (
    <Sheet onClose={onClose} label="Edit card">
      <div className="spread">
        <span style={{ fontSize: 18, fontWeight: 600 }}>{solo ? 'Edit card' : 'Edit group'}</span>
        <button className="link" onClick={onClose}>Done</button>
      </div>

      {solo && person ? (
        <div className="stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <label className="field">First name<input className="input" value={person.firstName} onChange={(e) => updatePerson(person.id, { firstName: e.target.value })} /></label>
            <label className="field">Last name<input className="input" value={person.lastName} onChange={(e) => updatePerson(person.id, { lastName: e.target.value })} /></label>
          </div>
          <label className="field">Organisation or church<input className="input" value={person.organisation} placeholder="Optional" onChange={(e) => updatePerson(person.id, { organisation: e.target.value })} /></label>
        </div>
      ) : (
        <label className="field">Group name<input className="input" value={card.name} onChange={(e) => updateCard(card.id, { name: e.target.value })} /></label>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <span className="label">Priority</span>
        <PriorityPicker value={card.priority} onChange={(p) => updateCard(card.id, { priority: p })} />
        <span className="tiny muted">
          {card.everyDay && card.priority === 'high' ? 'Comes up every day' : `${describeInterval(estimates[card.priority])} at ${settings.limit} cards a day`}
        </span>
      </div>

      {card.priority === 'high' && (
        <div className="spread">
          <span className="stack" style={{ gap: 2 }}>
            <span style={{ fontWeight: 500 }}>Every day</span>
            <span className="tiny sub">Always included in today's cards</span>
          </span>
          <Switch checked={!!card.everyDay} label="Every day" onChange={(v) => updateCard(card.id, { everyDay: v })} />
        </div>
      )}
      {card.everyDay && everyDay.full && (
        <div className="warn">
          You now have {everyDay.count} every-day cards and pray for {settings.limit} a day, so nobody else will come up.
          Turn off Every day on some cards, or raise your daily number in Settings.
        </div>
      )}

      {solo && person
        ? <PointEditor target={{ kind: 'person', id: person.id }} points={person.points} label="Prayer points" />
        : <PointEditor target={{ kind: 'card', id: card.id }} points={card.points} label="Prayer points for the whole group" />}

      <div className="stack" style={{ gap: 4 }}>
        <span className="label">{solo ? 'On this card' : 'People in this group'}</span>
        {members.map((p) => (
          <MemberRow key={p.id} person={p} card={card} solo={solo} open={openMember === p.id}
            onToggle={() => setOpenMember(openMember === p.id ? null : p.id)} ask={ask} onClose={onClose} />
        ))}
        <div className="spread" style={{ minHeight: 48 }}>
          <span>{solo ? 'And their children' : 'And children (not named)'}</span>
          <Switch checked={!!card.withChildren} label="And children" onChange={(v) => updateCard(card.id, { withChildren: v })} />
        </div>
        {addingPerson
          ? <AddPerson card={card} onDone={() => setAddingPerson(false)} />
          : <button className="link" onClick={() => setAddingPerson(true)}><Plus />{solo ? 'Add someone and make a group' : 'Add someone to this group'}</button>}
      </div>

      <div className="stack" style={{ gap: 0, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
        <button className="link" onClick={() => { onClose(); nav.go('card', { cardId: card.id, from: nav.current === 'card' ? nav.from : nav.current }); }}>History and answered prayers</button>
        {!solo && <button className="link" style={{ color: 'var(--sub)' }} onClick={confirmSplit}>Split into individual cards</button>}
        <div className="row" style={{ gap: 20 }}>
          <button className="link" style={{ color: 'var(--sub)' }} onClick={() => { setArchived(card.id, !card.archived); onClose(); }}>
            {card.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button className="link danger" onClick={confirmDelete}>Delete</button>
        </div>
      </div>
      {confirmNode}
    </Sheet>
  );
}

function MemberRow({ person, card, solo, open, onToggle, ask, onClose }) {
  const { updatePerson, removeFromGroup, deletePerson } = useStore();
  return (
    <div style={{ borderBottom: '1px solid var(--line)' }}>
      <button className="spread full" style={{ minHeight: 48 }} onClick={onToggle} aria-expanded={open}>
        <span className="row">
          <span style={{ fontWeight: 500 }}>{personName(person)}</span>
          {person.isChild && <span className="tiny muted">child</span>}
        </span>
        <span className="muted" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><Chevron /></span>
      </button>
      {open && (
        <div className="stack" style={{ paddingBottom: 12 }}>
          {!solo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label className="field">First name<input className="input" value={person.firstName} onChange={(e) => updatePerson(person.id, { firstName: e.target.value })} /></label>
              <label className="field">Last name<input className="input" value={person.lastName} onChange={(e) => updatePerson(person.id, { lastName: e.target.value })} /></label>
            </div>
          )}
          {!solo && (
            <>
              <div className="spread">
                <span className="stack" style={{ gap: 2 }}><span>Own tick box</span><span className="tiny sub">Off: shares one tick with the children</span></span>
                <Switch checked={person.ownTick} label="Own tick box" onChange={(v) => updatePerson(person.id, { ownTick: v })} />
              </div>
              <div className="spread">
                <span>Child</span>
                <Switch checked={person.isChild} label="Child" onChange={(v) => updatePerson(person.id, { isChild: v })} />
              </div>
              <PointEditor target={{ kind: 'person', id: person.id }} points={person.points} label={`Prayer points for ${person.firstName || personName(person)}`} placeholder={`Add a point for ${person.firstName || 'them'}`} />
            </>
          )}
          {!solo && (
            <div className="row" style={{ gap: 20 }}>
              <button className="link" style={{ color: 'var(--sub)', fontSize: 14 }} onClick={() => removeFromGroup(card.id, person.id)}>Give them their own card</button>
              <button className="link danger" style={{ fontSize: 14 }} onClick={() => ask({
                title: `Delete ${personName(person)}?`,
                message: 'This removes them and their prayer history.',
                confirmLabel: 'Delete', danger: true,
                onConfirm: () => deletePerson(person.id),
              })}>Delete</button>
            </div>
          )}
          {solo && <span className="tiny sub">Edit their name and prayer points above.</span>}
        </div>
      )}
    </div>
  );
}

// Add an existing person (moving them from their own card) or someone new.
function AddPerson({ card, onDone }) {
  const { people, cards, addToGroup, makeGroupFrom } = useStore();
  const [query, setQuery] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [child, setChild] = useState(false);
  const solo = !card.isGroup;
  const soloPerson = solo ? people.find((p) => p.id === card.personIds[0]) : null;
  const [groupName, setGroupName] = useState(soloPerson?.lastName ? `The ${soloPerson.lastName} family` : '');

  const candidates = people
    .filter((p) => !card.personIds.includes(p.id) && !p.archived)
    .filter((p) => !query || personName(p).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);
  const whereIs = (p) => {
    const c = cards.find((x) => x.personIds.includes(p.id) && isPrayable(x, people));
    return c && c.isGroup ? `in ${c.name}` : 'own card';
  };

  const commit = (members) => {
    if (solo) makeGroupFrom(card.id, groupName.trim() || `${personName(soloPerson)} and others`, members);
    else addToGroup(card.id, members);
    onDone();
  };

  return (
    <div className="surface stack" style={{ background: 'var(--soft)', padding: 14 }}>
      <div className="spread">
        <span style={{ fontWeight: 600 }}>Add someone</span>
        <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={onDone} aria-label="Cancel"><Close size={18} /></button>
      </div>
      {solo && <label className="field">Name for the new group<input className="input" style={{ background: '#fff' }} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="The Mitchell family" /></label>}
      <span className="label">Someone new</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <input className="input" style={{ background: '#fff' }} placeholder="First name" aria-label="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
        <input className="input" style={{ background: '#fff' }} placeholder="Last name" aria-label="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
      </div>
      <div className="spread">
        <span>Child (shares one tick box)</span>
        <Switch checked={child} label="Child" onChange={setChild} />
      </div>
      <button className="btn accent small" disabled={!first.trim()} style={{ opacity: first.trim() ? 1 : 0.5 }}
        onClick={() => first.trim() && commit({ newMembers: [{ firstName: first, lastName: last, isChild: child }] })}>Add {first.trim() || 'person'}</button>
      <span className="label" style={{ marginTop: 6 }}>Or someone already in the app</span>
      <input className="input" style={{ background: '#fff' }} placeholder="Search" aria-label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} />
      {candidates.map((p) => (
        <button key={p.id} className="spread" style={{ minHeight: 44 }} onClick={() => commit({ existingIds: [p.id] })}>
          <span>{personName(p)}</span><span className="tiny sub">{whereIs(p)} · add</span>
        </button>
      ))}
    </div>
  );
}
