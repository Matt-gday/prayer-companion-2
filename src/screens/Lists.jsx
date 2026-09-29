import { useState } from 'react';
import { useStore } from '../store.jsx';
import { formatShortDate, today } from '../model.js';
import { TopBar, Sheet, Tick, useConfirm, AutoText } from '../components/ui.jsx';
import { Back, Plus, List, Chevron, Grip, Trash, Upload, Check, Pencil, History } from '../components/Icons.jsx';

const weekLabel = (iso) => `Week of ${new Date(`${iso}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}`;
const COLOURS = ['var(--high)', 'var(--low)', 'var(--med)', 'var(--occ)'];

// All prayer lists (growth group, staff team…). Separate from daily cards.
export function ListsHome({ nav }) {
  const { lists, addList } = useStore();
  const [creating, setCreating] = useState(false);

  return (
    <div className="screen">
      <TopBar onBack={() => nav.go('home')} backLabel="Home"
        right={<button className="btn white small" onClick={() => setCreating(true)}><Plus />New list</button>} />
      <h1 className="title" style={{ padding: '0 4px' }}>Prayer lists</h1>
      <p style={{ opacity: 0.85, lineHeight: 1.45, padding: '0 4px', marginTop: -4 }}>
        For your growth group, a team, or anyone you pray for together. Separate from your daily cards, and everyone is on one screen.
      </p>
      {lists.map((l, i) => {
        const reqs = l.people.reduce((n, p) => n + p.requests.length, 0);
        return (
          <button key={l.id} className="surface row" style={{ textAlign: 'left', gap: 14, padding: 16 }} onClick={() => nav.go('list', { listId: l.id })}>
            <span style={{ width: 46, height: 46, borderRadius: 15, background: COLOURS[i % COLOURS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><List size={20} /></span>
            <span className="grow stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{l.name}</span>
              <span className="tiny sub">{l.people.length} {l.people.length === 1 ? 'person' : 'people'} · {reqs} request{reqs === 1 ? '' : 's'}</span>
              <span className="tiny" style={{ opacity: 0.7 }}>This week · {l.week.prayedAt ? `prayed ${dayName(l.week.prayedAt)}` : 'not prayed yet'}</span>
            </span>
            <span style={{ opacity: 0.7 }}><Chevron /></span>
          </button>
        );
      })}
      <button className="surface" style={{ border: '1.5px dashed rgba(255,255,255,.4)', background: 'transparent', fontWeight: 600, padding: 16 }} onClick={() => setCreating(true)}>
        + New list
      </button>
      {creating && (
        <NewListSheet onClose={() => setCreating(false)} onCreate={(name, names) => {
          const id = addList(name, names);
          setCreating(false);
          nav.go('list', { listId: id });
        }} />
      )}
    </div>
  );
}

function NewListSheet({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [names, setNames] = useState('');
  const [error, setError] = useState('');
  return (
    <Sheet onClose={onClose} label="New list">
      <div className="spread"><span style={{ fontSize: 18, fontWeight: 600 }}>New prayer list</span><button className="link" onClick={onClose}>Cancel</button></div>
      <label className="field">Name<input className="input" autoFocus placeholder="Growth group" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} /></label>
      <label className="field">People (one per line, you can add more later)
        <textarea className="input" rows={5} placeholder={'Josh\nNathan\nChris & Amy'} value={names} onChange={(e) => setNames(e.target.value)} />
      </label>
      {error && <span className="small danger">{error}</span>}
      <button className="btn primary" onClick={() => (name.trim() ? onCreate(name, names.split('\n')) : setError('Give the list a name'))}>Create list</button>
    </Sheet>
  );
}

// Points on the list this week, and how many have been checked.
const weekCounts = (list) => {
  const reqs = list.people.flatMap((p) => p.requests);
  return { total: reqs.length, prayed: reqs.filter((r) => list.week.ticks[r.id]).length, people: list.people.filter((p) => p.requests.length).length };
};
const dayName = (iso) => (iso === today() ? 'today' : new Date(`${iso}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'long' }));

// One list: tap a person to open their points in place. "Pray" goes to the
// pray page, where each point gets a check.
export function ListPage({ nav, listId }) {
  const { lists, addListPerson, renameList, deleteList, removeListPerson, moveListPerson, renameListPerson } = useStore();
  const [ask, confirmNode] = useConfirm();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(null);
  const [sheet, setSheet] = useState(null); // 'week' | 'share'
  const [adding, setAdding] = useState('');
  const [drag, setDrag] = useState(null);
  const list = lists.find((l) => l.id === listId);

  if (!list) {
    return <div className="screen"><TopBar onBack={() => nav.go('lists')} backLabel="Lists" /><div className="surface empty">This list has been deleted.</div></div>;
  }
  const counts = weekCounts(list);

  const onGripDown = (e, id, index) => {
    const row = e.currentTarget.closest('.list-person');
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id, from: index, startY: e.clientY, dy: 0, rowH: row ? row.offsetHeight : 56 });
  };
  const onGripUp = () => {
    if (!drag) return;
    const to = Math.max(0, Math.min(list.people.length - 1, drag.from + Math.round(drag.dy / drag.rowH)));
    if (to !== drag.from) moveListPerson(list.id, drag.id, to);
    setDrag(null);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back" onClick={() => nav.go('lists')}><Back />Lists</button>
        <span className="row" style={{ gap: 6 }}>
          {!editing && (
            <>
              <button className="icon-btn glass" style={{ width: 40, height: 40 }} aria-label="Share this week’s requests" onClick={() => setSheet('share')}><Upload size={18} /></button>
              <button className="icon-btn glass" style={{ width: 40, height: 40 }} aria-label="Past weeks" onClick={() => nav.go('listhistory', { listId: list.id })}><History /></button>
            </>
          )}
          {editing
            ? <button className="icon-btn" style={{ width: 40, height: 40, background: '#fff', color: 'var(--acc)' }} aria-label="Done editing" onClick={() => setEditing(false)}><Check size={18} /></button>
            : <button className="icon-btn glass" style={{ width: 40, height: 40 }} aria-label="Edit list" onClick={() => { setEditing(true); setOpen(null); }}><Pencil /></button>}
        </span>
      </div>

      {editing ? (
        <input className="input" style={{ fontSize: 22, fontWeight: 600, height: 52 }} value={list.name} aria-label="List name" onChange={(e) => renameList(list.id, e.target.value)} />
      ) : (
        <h1 className="title" style={{ fontSize: 32, padding: '0 4px' }}>{list.name}</h1>
      )}
      <span className="small" style={{ opacity: 0.8, padding: '0 4px', marginTop: -6 }}>{weekLabel(list.week.start)}</span>

      <div className="list cream" style={{ padding: '2px 14px' }}>
        {list.people.length === 0 && <div className="empty" style={{ padding: 20 }}>Add the people in this group below.</div>}
        {list.people.map((p, i) => (
          <div key={p.id} className="list-person"
            style={drag?.id === p.id ? { transform: `translateY(${drag.dy}px)`, background: 'rgba(255,255,255,.95)', position: 'relative', zIndex: 2, boxShadow: '0 6px 18px rgba(0,0,0,.15)', borderRadius: 10 } : undefined}>
            {editing ? (
              <>
                <span className="grip" role="button" aria-label={`Drag to move ${p.name}`}
                  onPointerDown={(e) => onGripDown(e, p.id, i)} onPointerMove={(e) => drag && setDrag({ ...drag, dy: e.clientY - drag.startY })}
                  onPointerUp={onGripUp} onPointerCancel={() => setDrag(null)}><Grip /></span>
                <input className="input grow" style={{ height: 40 }} value={p.name} aria-label="Name" onChange={(e) => renameListPerson(list.id, p.id, e.target.value)} />
                <button className="icon-btn" style={{ width: 36, height: 36, color: 'var(--muted)' }} aria-label={`Remove ${p.name}`}
                  onClick={() => ask({ title: `Remove ${p.name}?`, message: 'They’ll be taken off this list with their requests.', confirmLabel: 'Remove', danger: true, onConfirm: () => removeListPerson(list.id, p.id) })}>
                  <Trash />
                </button>
              </>
            ) : open === p.id ? (
              <PersonPoints list={list} person={p} onClose={() => setOpen(null)} />
            ) : (
              <button className="grow who" style={{ textAlign: 'left' }} onClick={() => setOpen(p.id)} aria-expanded="false">
                <div className="spread">
                  <span style={{ fontWeight: 600, fontSize: 15.5 }}>{p.name}</span>
                  <span className="muted"><Chevron size={14} style={{ transform: 'rotate(90deg)' }} /></span>
                </div>
                {p.requests.length
                  ? <div className="list-req">{p.requests.map((r) => r.text).join(' · ')}</div>
                  : <div className="list-req" style={{ opacity: 0.7 }}>Nothing this week · tap to add</div>}
              </button>
            )}
          </div>
        ))}
        <div className="row" style={{ gap: 8, padding: '10px 0' }}>
          <input className="input" placeholder="Add a person" aria-label="Add a person" value={adding}
            onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { addListPerson(list.id, adding); setAdding(''); } }} />
          <button className="btn accent" style={{ width: 46, height: 46, padding: 0, borderRadius: 12, flexShrink: 0 }} aria-label="Add person"
            onClick={() => { addListPerson(list.id, adding); setAdding(''); }}><Plus size={18} /></button>
        </div>
      </div>

      {editing ? (
        <button className="btn secondary" style={{ color: '#FFC2B8' }} onClick={() => ask({
          title: `Delete ${list.name}?`, message: 'This deletes the list, its people, requests and past weeks.', confirmLabel: 'Delete', danger: true,
          onConfirm: () => { deleteList(list.id); nav.go('lists'); },
        })}>Delete this list</button>
      ) : (
        <>
          {list.week.prayedAt && (
            <div className="row small" style={{ justifyContent: 'center', gap: 8, fontWeight: 600 }}>
              <span style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', color: 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} /></span>
              Prayed {dayName(list.week.prayedAt)} · {counts.prayed} of {counts.total} point{counts.total === 1 ? '' : 's'}
            </div>
          )}
          {counts.total > 0
            ? <button className="btn white" onClick={() => nav.go('listpray', { listId: list.id })}>Pray</button>
            : <span className="small" style={{ textAlign: 'center', opacity: 0.85 }}>Add some prayer points, then you can pray through them.</span>}
          <button className="btn secondary" onClick={() => setSheet('week')}>Start a new week</button>
        </>
      )}

      {sheet === 'week' && <NewWeekSheet list={list} onClose={() => setSheet(null)} />}
      {sheet === 'share' && <ShareSheet title="Share this week’s requests" text={shareText(list.name, list.week.start, list.people.map((p) => ({ name: p.name, requests: p.requests.map((x) => x.text) })))} onClose={() => setSheet(null)} />}
      {confirmNode}
    </div>
  );
}

// A person's points, opened in place: edit the words, delete, or add more.
function PersonPoints({ list, person, onClose }) {
  const { addRequest, editRequest, removeRequest } = useStore();
  const [draft, setDraft] = useState('');
  const add = () => { addRequest(list.id, person.id, draft); setDraft(''); };
  return (
    <div className="grow list-open">
      <button className="spread full" style={{ minHeight: 30 }} onClick={onClose} aria-expanded="true">
        <span style={{ fontWeight: 600, fontSize: 15.5 }}>{person.name}</span>
        <span className="muted"><Chevron size={14} style={{ transform: 'rotate(-90deg)' }} /></span>
      </button>
      {person.requests.map((r) => (
        <div key={r.id} className="pt-row">
          <AutoText value={r.text} onChange={(t) => editRequest(list.id, person.id, r.id, t)} />
          <button className="icon-btn" style={{ width: 36, height: 36, color: 'var(--muted)' }} aria-label={`Delete "${r.text}"`} onClick={() => removeRequest(list.id, person.id, r.id)}><Trash /></button>
        </div>
      ))}
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <input className="input" autoFocus={!person.requests.length} style={{ borderStyle: 'dashed', background: 'transparent' }} placeholder="Add a prayer point" aria-label="Add a prayer point" value={draft}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        <button className="btn accent" style={{ width: 46, height: 46, padding: 0, borderRadius: 12, flexShrink: 0 }} onClick={add} aria-label="Add prayer point"><Plus size={18} /></button>
      </div>
    </div>
  );
}

// Pray through the list: only people with points, a check beside each point.
export function ListPray({ nav, listId }) {
  const { lists, toggleListTick, finishListPrayer } = useStore();
  const list = lists.find((l) => l.id === listId);
  if (!list) return null;
  const counts = weekCounts(list);
  const back = () => nav.go('list', { listId });
  return (
    <div className="screen">
      <TopBar onBack={back} backLabel={list.name} right={<span className="small" style={{ fontWeight: 600, marginRight: 4 }}><b>{counts.prayed}</b> of {counts.total}</span>} />
      <div className="stack" style={{ gap: 2, padding: '0 4px' }}>
        <span className="small" style={{ opacity: 0.9 }}>Praying for</span>
        <h1 className="title" style={{ lineHeight: 1.05 }}>{list.name}</h1>
      </div>
      {list.people.filter((p) => p.requests.length).map((p) => (
        <div key={p.id} className="surface cream stack" style={{ gap: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{p.name}</span>
          {p.requests.map((r) => (
            <button key={r.id} className="member" style={{ borderBottom: 0, padding: '8px 0' }} onClick={() => toggleListTick(list.id, r.id)}
              aria-pressed={!!list.week.ticks[r.id]}>
              <Tick on={!!list.week.ticks[r.id]} small />
              <span className="read" style={{ fontSize: 'var(--point-size)', lineHeight: 1.4, opacity: list.week.ticks[r.id] ? 0.6 : 1 }}>{r.text}</span>
            </button>
          ))}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <button className="btn white" onClick={() => { finishListPrayer(list.id); back(); }}><Check size={18} />Finished</button>
    </div>
  );
}

function NewWeekSheet({ list, onClose }) {
  const { newWeek } = useStore();
  const [keep, setKeep] = useState(true);
  const Choice = ({ on, title, text, onClick }) => (
    <button onClick={onClick} className="row" style={{ textAlign: 'left', padding: 14, borderRadius: 14, gap: 12, background: on ? 'var(--soft)' : 'transparent', border: `1.5px solid ${on ? 'var(--acc)' : 'var(--line)'}` }}>
      <span className="grow stack" style={{ gap: 2 }}><b>{title}</b><span className="tiny sub">{text}</span></span>
      <span style={{ width: 20, height: 20, borderRadius: 10, border: on ? '6px solid var(--acc)' : '2px solid #CFC5DA', flexShrink: 0 }} />
    </button>
  );
  return (
    <Sheet onClose={onClose} label="Start a new week">
      <span style={{ fontSize: 18, fontWeight: 600 }}>Start a new week?</span>
      <span className="sub" style={{ lineHeight: 1.45 }}>Checks are cleared. This week is kept in the list’s past weeks.</span>
      <Choice on={keep} onClick={() => setKeep(true)} title="Keep all requests" text="Update them as people share" />
      <Choice on={!keep} onClick={() => setKeep(false)} title="Start with a clean slate" text="Clear every request" />
      <button className="btn primary" onClick={() => { newWeek(list.id, keep); onClose(); }}>Start the new week</button>
      <button className="link" style={{ alignSelf: 'center', color: 'var(--sub)' }} onClick={onClose}>Cancel</button>
    </Sheet>
  );
}

// people: [{ name, requests: [text] }]
const shareText = (listName, start, people) => [
  `${listName} · ${weekLabel(start).replace('Week', 'week')}`,
  '',
  ...people.filter((p) => p.requests.length).map((p) => `${p.name}: ${p.requests.join('; ')}`),
].join('\n');

function ShareSheet({ title, text, onClose }) {
  const { showToast } = useStore();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); showToast('Copied'); onClose(); } catch { showToast('Couldn’t copy. Select the text and copy it instead.'); }
  };
  const share = async () => {
    try { await navigator.share({ text }); onClose(); } catch { /* cancelled */ }
  };
  return (
    <Sheet onClose={onClose} label="Share requests">
      <span style={{ fontSize: 18, fontWeight: 600 }}>{title}</span>
      <div style={{ background: 'var(--soft)', borderRadius: 14, padding: 14, whiteSpace: 'pre-line', lineHeight: 1.5, fontSize: 14, userSelect: 'text' }}>{text}</div>
      <div style={{ display: 'grid', gridTemplateColumns: navigator.share ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8 }}>
        <button className="btn soft" onClick={copy}>Copy</button>
        {navigator.share && <button className="btn primary" onClick={share}>Share…</button>}
      </div>
    </Sheet>
  );
}

// Every past week of a list, newest first, each one shareable.
export function ListHistory({ nav, listId }) {
  const { lists } = useStore();
  const [sharing, setSharing] = useState(null);
  const list = lists.find((l) => l.id === listId);
  if (!list) return null;
  const weeks = [...(list.history || [])].reverse();
  return (
    <div className="screen">
      <TopBar onBack={() => nav.go('list', { listId })} backLabel={list.name} />
      <h1 className="title" style={{ fontSize: 32, padding: '0 4px' }}>{list.name}</h1>
      <span className="small" style={{ opacity: 0.8, padding: '0 4px', marginTop: -6 }}>Past weeks</span>
      {weeks.length === 0 && <div className="surface empty">No past weeks yet. They’re saved each time you start a new week.</div>}
      {weeks.map((w) => {
        const people = (w.people || []).filter((p) => p.requests.length);
        const summary = w.points != null
          ? `${w.prayedPoints} of ${w.points} point${w.points === 1 ? '' : 's'} prayed for`
          : `${Object.values(w.ticks || {}).filter(Boolean).length} of ${(w.people || []).length} prayed for`;
        return (
          <div key={w.start + w.end} className="surface cream stack" style={{ gap: 8 }}>
            <div className="spread" style={{ alignItems: 'flex-start' }}>
              <span className="stack" style={{ gap: 2 }}>
                <b style={{ fontSize: 16 }}>{weekLabel(w.start)}</b>
                <span className="tiny sub">{summary} · ended {formatShortDate(w.end)}</span>
              </span>
              {people.length > 0 && (
                <button className="chip-btn" style={{ flexShrink: 0 }} onClick={() => setSharing(w)}><Upload size={14} />Send</button>
              )}
            </div>
            {people.length === 0 && <span className="small sub">No prayer points that week.</span>}
            {people.map((p) => (
              <span key={p.name} className="small" style={{ lineHeight: 1.45 }}><b>{p.name}:</b> {p.requests.join('; ')}</span>
            ))}
          </div>
        );
      })}
      {sharing && (
        <ShareSheet title={`Send ${weekLabel(sharing.start).replace('Week', 'week')}`}
          text={shareText(list.name, sharing.start, sharing.people || [])} onClose={() => setSharing(null)} />
      )}
    </div>
  );
}
