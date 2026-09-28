import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { personName, isPrayable, PRIORITY_LABEL } from '../model.js';
import { estimateIntervals, describeInterval } from '../scheduler.js';
import { PriorityPicker, Switch } from '../components/ui.jsx';
import { OptionCard } from '../components/Choosers.jsx';
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
  const [members, setMembers] = useState([]); // { key, name, existingId?, isChild }
  const [typing, setTyping] = useState('');
  const [child, setChild] = useState(false);
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

  const addMember = (m) => { setMembers([...members, { key: Math.random().toString(36).slice(2), ...m }]); setTyping(''); setChild(false); };

  const goDetails = () => { setError(''); setStep(2); window.scrollTo(0, 0); };
  const goPoints = () => {
    if (kind === 'person' && !first.trim() && !last.trim()) return setError('Enter their name');
    if (kind === 'org' && !org.trim()) return setError('Enter the organisation’s name');
    if (kind === 'group' && !groupName.trim()) return setError('Enter a name for the group');
    if (kind === 'group' && members.length === 0 && !typing.trim()) return setError('Add at least one person');
    if (kind === 'group' && typing.trim()) addMember({ name: typing.trim(), isChild: child });
    setError('');
    setStep(3);
    window.scrollTo(0, 0);
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
        newMembers: members.filter((m) => !m.existingId).map((m) => ({ ...split(m.name), isChild: m.isChild })),
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
            <input className="input" placeholder="Type a name" aria-label="Add someone to the group" value={typing}
              onChange={(e) => { setTyping(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && typing.trim()) addMember({ name: typing.trim(), isChild: child }); }} />
            {q && (
              <div className="suggest">
                {suggestions.map((p) => (
                  <button key={p.id} onClick={() => addMember({ name: personName(p), existingId: p.id })}>
                    <span><b>{personName(p)}</b><div className="tiny" style={{ color: '#7A6A80' }}>Already in the app · {where(p)}</div></span>
                    <span style={{ color: 'var(--acc)', fontWeight: 600 }}>Add</span>
                  </button>
                ))}
                <button onClick={() => addMember({ name: typing.trim(), isChild: child })}>
                  <span><b>Add “{typing.trim()}”</b><div className="tiny" style={{ color: '#7A6A80' }}>As someone new</div></span>
                  <Plus />
                </button>
                <div className="spread" style={{ padding: '10px 14px', fontSize: 13, color: '#6E6078' }}>
                  <span>A child (shares one tick box)</span>
                  <Switch checked={child} label="Child" onChange={setChild} />
                </div>
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
        {error && <div className="small" style={{ color: '#FFC2B8' }}>{error}</div>}
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
          <input className="input" style={{ background: '#fff' }} placeholder={points.length ? 'Add another' : 'Wisdom in the new job'} aria-label="Prayer point"
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

