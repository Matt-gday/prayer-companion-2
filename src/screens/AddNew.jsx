import { useState } from 'react';
import { useStore } from '../store.jsx';
import { personName, splitLines } from '../model.js';
import { Sheet, Segmented, PriorityPicker, Switch } from '../components/ui.jsx';
import { Plus, Close } from '../components/Icons.jsx';

const blankMember = () => ({ firstName: '', lastName: '', isChild: false });

export default function AddNew({ onClose }) {
  const { people, cards, addSolo, addGroup, showToast } = useStore();
  const [kind, setKind] = useState('person');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [org, setOrg] = useState('');
  const [groupName, setGroupName] = useState('');
  const [priority, setPriority] = useState('med');
  const [everyDay, setEveryDay] = useState(false);
  const [points, setPoints] = useState('');
  const [members, setMembers] = useState([blankMember(), blankMember()]);
  const [existing, setExisting] = useState([]);
  const [withChildren, setWithChildren] = useState(false);
  const [error, setError] = useState('');

  const save = () => {
    const pts = splitLines(points);
    if (kind === 'person') {
      if (!first.trim() && !last.trim()) return setError('Enter a name');
      addSolo({ firstName: first, lastName: last, organisation: org, priority, everyDay, points: pts });
      showToast(`Added ${`${first} ${last}`.trim()}`);
    } else if (kind === 'org') {
      if (!org.trim()) return setError('Enter the organisation’s name');
      addSolo({ organisation: org, priority, everyDay, points: pts });
      showToast(`Added ${org.trim()}`);
    } else {
      const named = members.filter((m) => m.firstName.trim());
      if (!groupName.trim()) return setError('Enter a name for the group');
      if (named.length + existing.length === 0) return setError('Add at least one person');
      addGroup({ name: groupName, priority, everyDay, points: pts, newMembers: named, existingIds: existing, withChildren });
      showToast(`Added ${groupName.trim()}`);
    }
    onClose();
  };

  const setMember = (i, patch) => setMembers(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const available = people.filter((p) => !p.archived && !existing.includes(p.id));
  const soloIds = new Set(cards.filter((c) => !c.isGroup).flatMap((c) => c.personIds));

  return (
    <Sheet onClose={onClose} label="Add">
      <div className="spread">
        <span style={{ fontSize: 18, fontWeight: 600 }}>Add</span>
        <button className="link" onClick={onClose}>Cancel</button>
      </div>
      <Segmented value={kind} onChange={(k) => { setKind(k); setError(''); }} label="What are you adding"
        options={[{ value: 'person', label: 'Person' }, { value: 'org', label: 'Organisation' }, { value: 'group', label: 'Group' }]} />

      {kind === 'person' && (
        <div className="stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <label className="field">First name<input className="input" autoFocus value={first} onChange={(e) => { setFirst(e.target.value); setError(''); }} /></label>
            <label className="field">Last name<input className="input" value={last} onChange={(e) => setLast(e.target.value)} /></label>
          </div>
          <label className="field">Organisation or church<input className="input" placeholder="Optional" value={org} onChange={(e) => setOrg(e.target.value)} /></label>
        </div>
      )}
      {kind === 'org' && (
        <label className="field">Organisation name<input className="input" autoFocus value={org} placeholder="OMF Thailand" onChange={(e) => { setOrg(e.target.value); setError(''); }} /></label>
      )}
      {kind === 'group' && (
        <div className="stack">
          <label className="field">Group name<input className="input" autoFocus value={groupName} placeholder="The Mitchell family" onChange={(e) => { setGroupName(e.target.value); setError(''); }} /></label>
          <span className="label">People in the group</span>
          {members.map((m, i) => (
            <div key={i} className="row" style={{ gap: 8 }}>
              <input className="input" placeholder="First name" aria-label={`Person ${i + 1} first name`} value={m.firstName} onChange={(e) => { setMember(i, { firstName: e.target.value }); setError(''); }} />
              <input className="input" placeholder="Last name" aria-label={`Person ${i + 1} last name`} value={m.lastName} onChange={(e) => setMember(i, { lastName: e.target.value })} />
              <button className={`chip-btn ${m.isChild ? 'answered' : ''}`} onClick={() => setMember(i, { isChild: !m.isChild })} aria-pressed={m.isChild}>Child</button>
            </div>
          ))}
          <button className="link" style={{ fontSize: 14 }} onClick={() => setMembers([...members, blankMember()])}><Plus />Another person</button>
          {existing.length > 0 && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {existing.map((id) => {
                const p = people.find((x) => x.id === id);
                return <button key={id} className="chip" aria-pressed="true" onClick={() => setExisting(existing.filter((x) => x !== id))}>{personName(p)} <Close size={14} /></button>;
              })}
            </div>
          )}
          {available.length > 0 && (
            <label className="field">Or add someone already in the app
              <select className="input" value="" onChange={(e) => { if (e.target.value) { setExisting([...existing, e.target.value]); setError(''); } }}>
                <option value="">Choose a person…</option>
                {available.map((p) => <option key={p.id} value={p.id}>{personName(p)}{soloIds.has(p.id) ? '' : ' (in a group)'}</option>)}
              </select>
            </label>
          )}
          <div className="spread">
            <span>And children (not named)</span>
            <Switch checked={withChildren} label="And children" onChange={setWithChildren} />
          </div>
        </div>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <span className="label">Priority</span>
        <PriorityPicker value={priority} onChange={(p) => { setPriority(p); if (p !== 'high') setEveryDay(false); }} />
      </div>
      {priority === 'high' && (
        <div className="spread">
          <span className="stack" style={{ gap: 2 }}><span style={{ fontWeight: 500 }}>Every day</span><span className="tiny sub">Always included in today's cards</span></span>
          <Switch checked={everyDay} label="Every day" onChange={setEveryDay} />
        </div>
      )}
      <label className="field">Prayer points (one per line)
        <textarea className="input" rows={3} value={points} onChange={(e) => setPoints(e.target.value)} placeholder={'Wisdom in the new job\nHealing for her mum'} />
      </label>
      {error && <div className="small" style={{ color: 'var(--danger)' }}>{error}</div>}
      <button className="btn primary" onClick={save}>Add</button>
    </Sheet>
  );
}
