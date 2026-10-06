import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { personName, isPrayable, PRIORITY_LABEL } from '../model.js';
import { estimateIntervals, describeInterval } from '../scheduler.js';
import { PriorityPicker, Switch } from '../components/ui.jsx';
import { OptionCard } from '../components/Choosers.jsx';
import { scrollToTop } from '../scroll.js';
import { Back, Next, Close, Users, Building, Plus } from '../components/Icons.jsx';

const PersonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

// Adding someone in three short steps: who, details, prayer points.
export default function AddFlow({ nav, from }) {
  const { people, cards, settings, date, addSolo, addGroup, showToast } = useStore();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState('person');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [org, setOrg] = useState('');
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState([]); // { key, name, existingId? } or a new person's details
  const [typing, setTyping] = useState('');
  const [newbie, setNewbie] = useState(null); // the new person being filled in
  const [priority, setPriority] = useState('med');
  const [everyDay, setEveryDay] = useState(false);
  const [points, setPoints] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const estimates = useMemo(() => estimateIntervals(cards, people, settings.limit, date), [cards, people, settings.limit, date]);
  const leave = () => nav.go(from === 'people' ? 'people' : 'home');
  const title = kind === 'group' ? (groupName.trim() || 'A family or group') : kind === 'org' ? (org.trim() || 'An organisation') : (`${first} ${last}`.trim() || 'Someone new');

  const where = (p) => {
    const c = cards.find((x) => x.personIds.includes(p.id) && isPrayable(x, people));
    return c ? (c.isGroup ? `in ${c.name}` : 'own card') : 'no card';
  };
  const q = typing.trim().toLowerCase();
  const suggestions = q
    ? people.filter((p) => !p.archived && !members.some((m) => m.existingId === p.id) && personName(p).toLowerCase().includes(q)).slice(0, 4)
    : [];

  const addMember = (m) => { setMembers([...members, { key: Math.random().toString(36).slice(2), ...m }]); setTyping(''); };

  // Someone new: open their details, as a full person unless changed.
  const surname = () => (groupName.match(/^the\s+(.+?)\s+(family|household)$/i) || [])[1] || '';
  const startNew = (text) => {
    const [f, ...rest] = text.trim().split(/\s+/);
    setNewbie({ firstName: f || '', lastName: rest.join(' ') || surname(), organisation: '', points: [], draft: '', isChild: false });
    setTyping('');
    setError('');
  };
  const saveNewbie = () => {
    const n = newbie;
    if (!n.firstName.trim()) { setError('Enter their first name'); return false; }
    const points = n.draft.trim() ? [...n.points, n.draft.trim()] : n.points;
    const full = !n.isChild;
    addMember({
      name: `${n.firstName.trim()} ${full ? n.lastName.trim() : ''}`.trim(),
      firstName: n.firstName.trim(),
      lastName: n.lastName.trim(),
      organisation: full ? n.organisation.trim() : '',
      points: full ? points : [],
      isChild: n.isChild,
    });
    setNewbie(null);
    return true;
  };

  const goDetails = () => { setError(''); setStep(2); scrollToTop(); };
  const goPoints = () => {
    if (kind === 'person' && !first.trim() && !last.trim()) return setError('Enter their name');
    if (kind === 'org' && !org.trim()) return setError('Enter the organisation’s name');
    if (kind === 'group' && !groupName.trim()) return setError('Enter a name for the group');
    if (kind === 'group' && newbie && !saveNewbie()) return undefined;
    if (kind === 'group' && typing.trim()) { startNew(typing); return setError('Check their details, then tap Add to group'); }
    if (kind === 'group' && members.length === 0 && !newbie) return setError('Add at least one person');
    setError('');
    setStep(3);
    scrollToTop();
  };
  const addPoint = () => { if (draft.trim()) { setPoints([...points, draft.trim()]); setDraft(''); } };

  const finish = () => {
    const pts = draft.trim() ? [...points, draft.trim()] : points;
    const ed = priority === 'high' && everyDay;
    if (kind === 'person') addSolo({ firstName: first, lastName: last, organisation: org, priority, everyDay: ed, points: pts });
    else if (kind === 'org') addSolo({ organisation: org, priority, everyDay: ed, points: pts });
    else {
      const split = (name) => { const [f, ...rest] = name.trim().split(/\s+/); return { firstName: f, lastName: rest.join(' ') }; };
      addGroup({
        name: groupName, priority, everyDay: ed, points: pts,
        existingIds: members.filter((m) => m.existingId).map((m) => m.existingId),
        newMembers: members.filter((m) => !m.existingId).map((m) => (m.firstName !== undefined
          ? { firstName: m.firstName, lastName: m.lastName, organisation: m.organisation, points: m.points, isChild: m.isChild }
          : { ...split(m.name), isChild: m.isChild })),
      });
    }
    showToast(`Added ${title}`);
    leave();
  };

  const dots = (
    <div className="step-dots" aria-label={`Step ${step} of 3`}>{[1, 2, 3].map((i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
  );
  const top = (
    <div className="topbar">
      {step === 1
        ? <button className="back" onClick={leave}><Close size={18} />Cancel</button>
        : <button className="back" onClick={() => setStep(step - 1)}><Back />Back</button>}
      <span />
    </div>
  );
  const cont = (label, onClick) => (
    <button className="continue" onClick={onClick}>{label}<span className="arrow"><Next size={20} /></span></button>
  );

  if (step === 1) {
    return (
      <div className="screen">
        {dots}{top}
        <h1 className="big-title" style={{ fontSize: 30 }}>Who would you like to pray for?</h1>
        <div className="stack" style={{ gap: 10, marginTop: 6 }}>
          <OptionCard selected={kind === 'person'} onClick={() => setKind('person')} icon={<PersonIcon />} title="A person" text="A friend, family member or colleague" />
          <OptionCard selected={kind === 'group'} onClick={() => setKind('group')} icon={<Users size={22} />} title="A family or group" text="Pray for them together on one card" />
          <OptionCard selected={kind === 'org'} onClick={() => setKind('org')} icon={<Building size={22} />} title="An organisation" text="A church, mission or ministry" />
        </div>
        <div style={{ flex: 1 }} />
        {cont('Continue', goDetails)}
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="screen">
        {dots}{top}
        <h1 className="big-title" style={{ fontSize: 30 }}>{title}</h1>

        {kind === 'person' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label className="field">First name<input className="input" autoFocus value={first} onChange={(e) => { setFirst(e.target.value); setError(''); }} /></label>
              <label className="field">Last name<input className="input" value={last} onChange={(e) => setLast(e.target.value)} /></label>
            </div>
            <label className="field">Church or organisation<input className="input" placeholder="Optional" value={org} onChange={(e) => setOrg(e.target.value)} /></label>
          </>
        )}

        {kind === 'org' && (
          <label className="field">Organisation name<input className="input" autoFocus placeholder="OMF Thailand" value={org} onChange={(e) => { setOrg(e.target.value); setError(''); }} /></label>
        )}

        {kind === 'group' && (
          <>
            <label className="field">Family or group name<input className="input" autoFocus placeholder="The Torres family" value={groupName} onChange={(e) => { setGroupName(e.target.value); setError(''); }} /></label>
            <span className="label">Who’s in it</span>
            {members.length > 0 && (
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {members.map((m) => (
                  <span key={m.key} className="bubble">{m.name}{m.isChild ? ' · child' : ''}
                    <button aria-label={`Remove ${m.name}`} onClick={() => setMembers(members.filter((x) => x.key !== m.key))}><Close size={14} /></button>
                  </span>
                ))}
              </div>
            )}
            {newbie ? (
              <NewPersonPanel person={newbie} onChange={(patch) => { setNewbie({ ...newbie, ...patch }); setError(''); }}
                onAdd={saveNewbie} onCancel={() => { setNewbie(null); setError(''); }} />
            ) : (
              <input className="input" placeholder="Type a name" aria-label="Add someone to the group" value={typing}
                onChange={(e) => { setTyping(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && typing.trim()) startNew(typing); }} />
            )}
            {q && !newbie && (
              <div className="suggest">
                {suggestions.map((p) => (
                  <button key={p.id} onClick={() => addMember({ name: personName(p), existingId: p.id })}>
                    <span><b>{personName(p)}</b><div className="tiny" style={{ color: '#7A6A80' }}>Already in the app · {where(p)}</div></span>
                    <span style={{ color: 'var(--acc)', fontWeight: 600 }}>Add</span>
                  </button>
                ))}
                <button onClick={() => startNew(typing)}>
                  <span><b>Add “{typing.trim()}”</b><div className="tiny" style={{ color: '#7A6A80' }}>Someone new · add their details</div></span>
                  <Plus />
                </button>
              </div>
            )}
          </>
        )}

        <span className="label" style={{ marginTop: 6 }}>How often?</span>
        <PriorityPicker value={priority} onChange={(p) => { setPriority(p); if (p !== 'high') setEveryDay(false); }} />
        <span className="small" style={{ opacity: 0.85 }}>
          {estimates[priority] == null
            ? { high: 'High comes up the most often.', med: 'Medium comes up regularly.', low: 'Low comes up less often.', occ: 'Occasional comes up now and then.' }[priority]
            : `${PRIORITY_LABEL[priority]} comes up ${describeInterval(estimates[priority]).toLowerCase()} at ${settings.limit} cards a day.`}
        </span>
        {priority === 'high' && (
          <div className="spread surface" style={{ padding: '12px 14px' }}>
            <span className="stack" style={{ gap: 2 }}><span style={{ fontWeight: 600 }}>Every day</span><span className="tiny sub">Always included in today’s cards</span></span>
            <Switch checked={everyDay} label="Every day" onChange={setEveryDay} />
          </div>
        )}
        {error && <div className="small" style={{ color: 'var(--error-soft)' }}>{error}</div>}
        <div style={{ flex: 1 }} />
        {cont('Continue', goPoints)}
      </div>
    );
  }

  return (
    <div className="screen">
      {dots}{top}
      <h1 className="big-title" style={{ fontSize: 30 }}>What can you pray for?</h1>
      <p style={{ opacity: 0.85, marginTop: -6 }}>{kind === 'group' ? 'Things for the whole group. You can add personal points for each person later.' : 'Add as many as you like, or skip for now.'}</p>
      <div className="list cream" style={{ padding: '4px 14px' }}>
        {points.map((p, i) => (
          <div key={`${p}${i}`} className="list-row" style={{ minHeight: 48 }}>
            <span className="bullet" style={{ marginTop: 0 }} />
            <span className="grow read" style={{ fontSize: 16 }}>{p}</span>
            <button className="icon-btn" style={{ width: 36, height: 36, color: 'var(--muted)' }} aria-label={`Remove ${p}`} onClick={() => setPoints(points.filter((_, j) => j !== i))}><Close size={16} /></button>
          </div>
        ))}
        <div className="row" style={{ gap: 8, padding: '8px 0' }}>
          <input className="input" placeholder={points.length ? 'Add another' : 'Wisdom in the new job'} aria-label="Prayer point"
            value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addPoint(); }} />
          <button className="btn accent" style={{ width: 46, height: 46, padding: 0, borderRadius: 12, flexShrink: 0 }} onClick={addPoint} aria-label="Add prayer point"><Plus size={18} /></button>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <button className="continue" onClick={finish}>Add {title}</button>
      <div className="tiny" style={{ textAlign: 'center', opacity: 0.8 }}>They’ll start appearing in your daily cards</div>
    </div>
  );
}


// A new group member's details. A full person by default (own tick box,
// organisation, their own prayer points); or just a name, like a child.
function NewPersonPanel({ person, onChange, onAdd, onCancel }) {
  const full = !person.isChild;
  const addPoint = () => { if (person.draft.trim()) onChange({ points: [...person.points, person.draft.trim()], draft: '' }); };
  return (
    <div className="surface cream stack" style={{ padding: 14, gap: 12 }}>
      <div className="spread">
        <span style={{ fontWeight: 600 }}>New person</span>
        <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={onCancel} aria-label="Cancel"><Close size={18} /></button>
      </div>
      <div className="seg" aria-label="Kind of person" style={{ background: 'rgba(35,27,51,.07)' }}>
        <button aria-pressed={full} onClick={() => onChange({ isChild: false })}>Full person</button>
        <button aria-pressed={!full} onClick={() => onChange({ isChild: true })}>Just a name</button>
      </div>
      <span className="tiny sub" style={{ marginTop: -4 }}>
        {full ? 'Their own tick box, and their own prayer points.' : 'For a child: just their name, sharing one tick box.'}
      </span>
      {full ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <label className="field">First name<input className="input" autoFocus value={person.firstName} onChange={(e) => onChange({ firstName: e.target.value })} /></label>
            <label className="field">Last name<input className="input" value={person.lastName} onChange={(e) => onChange({ lastName: e.target.value })} /></label>
          </div>
          <label className="field">Church or organisation<input className="input" placeholder="Optional" value={person.organisation} onChange={(e) => onChange({ organisation: e.target.value })} /></label>
          <span className="field" style={{ marginBottom: -4 }}>Their prayer points</span>
          {person.points.map((p, i) => (
            <div key={`${p}${i}`} className="row" style={{ gap: 8 }}>
              <span className="bullet" style={{ marginTop: 0 }} />
              <span className="grow">{p}</span>
              <button className="icon-btn" style={{ width: 32, height: 32, color: 'var(--muted)' }} aria-label={`Remove ${p}`}
                onClick={() => onChange({ points: person.points.filter((_, j) => j !== i) })}><Close size={14} /></button>
            </div>
          ))}
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="Optional" aria-label="Their prayer point" value={person.draft}
              onChange={(e) => onChange({ draft: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') addPoint(); }} />
            <button className="btn accent" style={{ width: 46, height: 46, padding: 0, borderRadius: 12, flexShrink: 0 }} onClick={addPoint} aria-label="Add their prayer point"><Plus size={18} /></button>
          </div>
        </>
      ) : (
        <label className="field">Name<input className="input" autoFocus value={person.firstName} onChange={(e) => onChange({ firstName: e.target.value })} /></label>
      )}
      <button className="btn accent" onClick={onAdd}>Add to group</button>
    </div>
  );
}
