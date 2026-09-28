import { useState } from 'react';
import { useStore } from '../store.jsx';
import { formatShortDate } from '../model.js';
import { TopBar, Sheet, Tick, useConfirm, AutoText } from '../components/ui.jsx';
import { Back, Plus, List, Chevron, Grip, Trash, Upload } from '../components/Icons.jsx';

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
        const done = l.people.filter((p) => l.week.ticks[p.id]).length;
        const reqs = l.people.reduce((n, p) => n + p.requests.length, 0);
        return (
          <button key={l.id} className="surface row" style={{ textAlign: 'left', gap: 14, padding: 16 }} onClick={() => nav.go('list', { listId: l.id })}>
            <span style={{ width: 46, height: 46, borderRadius: 15, background: COLOURS[i % COLOURS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><List size={20} /></span>
            <span className="grow stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{l.name}</span>
              <span className="tiny sub">{l.people.length} {l.people.length === 1 ? 'person' : 'people'} · {reqs} request{reqs === 1 ? '' : 's'}</span>
              <span className="tiny" style={{ opacity: 0.7 }}>This week · {done ? `${done} of ${l.people.length} prayed for` : 'not started'}</span>
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

// One list: everyone on a single screen, tick as you pray.
export function ListPage({ nav, listId }) {
  const { lists, toggleListTick, addListPerson, renameList, deleteList, removeListPerson, moveListPerson } = useStore();
  const [ask, confirmNode] = useConfirm();
  const [editing, setEditing] = useState(false);
  const [person, setPerson] = useState(null);
  const [sheet, setSheet] = useState(null); // 'week' | 'share' | 'history'
  const [adding, setAdding] = useState('');
  const [drag, setDrag] = useState(null);
  const list = lists.find((l) => l.id === listId);

  if (!list) {
    return <div className="screen"><TopBar onBack={() => nav.go('lists')} backLabel="Lists" /><div className="surface empty">This list has been deleted.</div></div>;
  }
  const done = list.people.filter((p) => list.week.ticks[p.id]).length;

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
          {!editing && <button className="icon-btn glass" style={{ width: 40, height: 40 }} aria-label="Share this week’s requests" onClick={() => setSheet('share')}><Upload size={18} /></button>}
          <button className="link" style={{ color: '#fff', padding: '0 6px' }} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</button>
        </span>
      </div>

      {editing ? (
        <input className="input" style={{ fontSize: 22, fontWeight: 600, height: 52 }} value={list.name} aria-label="List name" onChange={(e) => renameList(list.id, e.target.value)} />
      ) : (
        <div className="spread" style={{ alignItems: 'baseline', padding: '0 4px' }}>
          <h1 className="title" style={{ fontSize: 32 }}>{list.name}</h1>
          <span className="small" style={{ opacity: 0.9 }}>{done} of {list.people.length}</span>
        </div>
      )}
      <span className="small" style={{ opacity: 0.8, padding: '0 4px', marginTop: -6 }}>{weekLabel(list.week.start)}</span>

      <div className="list cream" style={{ padding: '2px 14px' }}>
        {list.people.length === 0 && <div className="empty" style={{ padding: 20 }}>Add the people in this group below.</div>}
        {list.people.map((p, i) => {
          const ticked = !!list.week.ticks[p.id];
          return (
            <div key={p.id} className={`list-person ${ticked && !editing ? 'done' : ''}`}
              style={drag?.id === p.id ? { transform: `translateY(${drag.dy}px)`, background: 'rgba(255,255,255,.95)', position: 'relative', zIndex: 2, boxShadow: '0 6px 18px rgba(0,0,0,.15)', borderRadius: 10 } : undefined}>
              {editing ? (
                <span className="grip" role="button" aria-label={`Drag to move ${p.name}`}
                  onPointerDown={(e) => onGripDown(e, p.id, i)} onPointerMove={(e) => drag && setDrag({ ...drag, dy: e.clientY - drag.startY })}
                  onPointerUp={onGripUp} onPointerCancel={() => setDrag(null)}><Grip /></span>
              ) : (
                <button onClick={() => toggleListTick(list.id, p.id)} aria-label={ticked ? `Untick ${p.name}` : `Tick ${p.name}`} style={{ paddingTop: 1 }}>
                  <Tick on={ticked} small />
                </button>
              )}
              <button className="grow who" style={{ textAlign: 'left' }} onClick={() => setPerson(p.id)}>
                <div style={{ fontWeight: 600, fontSize: 15.5 }}>{p.name}</div>
                {p.requests.length
                  ? p.requests.map((r) => <div key={r.id} className="list-req">{r.text}</div>)
                  : <div className="list-req" style={{ opacity: 0.7 }}>No requests yet · tap to add</div>}
              </button>
              {editing && (
                <button className="icon-btn" style={{ width: 36, height: 36, color: 'var(--muted)' }} aria-label={`Remove ${p.name}`}
                  onClick={() => ask({ title: `Remove ${p.name}?`, message: 'They’ll be taken off this list with their requests.', confirmLabel: 'Remove', danger: true, onConfirm: () => removeListPerson(list.id, p.id) })}>
                  <Trash />
                </button>
              )}
            </div>
          );
        })}
        <div className="row" style={{ gap: 8, padding: '10px 0' }}>
          <input className="input" style={{ background: '#fff' }} placeholder="Add a person" aria-label="Add a person" value={adding}
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
          <button className="btn secondary" onClick={() => setSheet('week')}>Start a new week</button>
          {(list.history || []).length > 0 && (
            <button className="small" style={{ minHeight: 40, opacity: 0.85 }} onClick={() => setSheet('history')}>Past weeks ({list.history.length})</button>
          )}
        </>
      )}

      {person && <PersonSheet list={list} personId={person} onClose={() => setPerson(null)} />}
      {sheet === 'week' && <NewWeekSheet list={list} onClose={() => setSheet(null)} />}
      {sheet === 'share' && <ShareSheet list={list} onClose={() => setSheet(null)} />}
      {sheet === 'history' && <HistorySheet list={list} onClose={() => setSheet(null)} />}
      {confirmNode}
    </div>
  );
}

// Tap a person to change their name and this week's requests.
function PersonSheet({ list, personId, onClose }) {
  const { addRequest, editRequest, removeRequest, renameListPerson } = useStore();
  const [draft, setDraft] = useState('');
  const p = list.people.find((x) => x.id === personId);
  if (!p) return null;
  const add = () => { addRequest(list.id, p.id, draft); setDraft(''); };
  return (
    <Sheet onClose={onClose} label={p.name}>
      <div className="spread"><span style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</span><button className="link" onClick={onClose}>Done</button></div>
      <label className="field">Name<input className="input" value={p.name} onChange={(e) => renameListPerson(list.id, p.id, e.target.value)} /></label>
      <span className="label">Requests</span>
      <div className="stack" style={{ gap: 0 }}>
        {p.requests.map((r) => (
          <div key={r.id} className="pt-row">
            <AutoText value={r.text} onChange={(t) => editRequest(list.id, p.id, r.id, t)} />
            <button className="icon-btn" style={{ width: 38, height: 38, color: 'var(--muted)' }} aria-label={`Delete "${r.text}"`} onClick={() => removeRequest(list.id, p.id, r.id)}><Trash /></button>
          </div>
        ))}
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input className="input" autoFocus={!p.requests.length} placeholder="Add a request" aria-label="Add a request" value={draft}
            onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          <button className="btn accent" style={{ width: 46, height: 46, padding: 0, borderRadius: 12, flexShrink: 0 }} onClick={add} aria-label="Add request"><Plus size={18} /></button>
        </div>
      </div>
    </Sheet>
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
      <span className="sub" style={{ lineHeight: 1.45 }}>Ticks are cleared. This week is kept in the list’s past weeks.</span>
      <Choice on={keep} onClick={() => setKeep(true)} title="Keep all requests" text="Update them as people share" />
      <Choice on={!keep} onClick={() => setKeep(false)} title="Start with a clean slate" text="Clear every request" />
      <button className="btn primary" onClick={() => { newWeek(list.id, keep); onClose(); }}>Start the new week</button>
      <button className="link" style={{ alignSelf: 'center', color: 'var(--sub)' }} onClick={onClose}>Cancel</button>
    </Sheet>
  );
}

const shareText = (list) => [
  `${list.name} · ${weekLabel(list.week.start).replace('Week', 'week')}`,
  '',
  ...list.people.filter((p) => p.requests.length).map((p) => `${p.name}: ${p.requests.map((r) => r.text).join('; ')}`),
].join('\n');

function ShareSheet({ list, onClose }) {
  const { showToast } = useStore();
  const text = shareText(list);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); showToast('Copied'); onClose(); } catch { showToast('Couldn’t copy. Select the text and copy it instead.'); }
  };
  const share = async () => {
    try { await navigator.share({ text }); onClose(); } catch { /* cancelled */ }
  };
  return (
    <Sheet onClose={onClose} label="Share requests">
      <span style={{ fontSize: 18, fontWeight: 600 }}>Share this week’s requests</span>
      <div style={{ background: 'var(--soft)', borderRadius: 14, padding: 14, whiteSpace: 'pre-line', lineHeight: 1.5, fontSize: 14, userSelect: 'text' }}>{text}</div>
      <div style={{ display: 'grid', gridTemplateColumns: navigator.share ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8 }}>
        <button className="btn soft" onClick={copy}>Copy</button>
        {navigator.share && <button className="btn primary" onClick={share}>Share…</button>}
      </div>
    </Sheet>
  );
}

function HistorySheet({ list, onClose }) {
  const weeks = [...(list.history || [])].reverse();
  return (
    <Sheet onClose={onClose} label="Past weeks">
      <div className="spread"><span style={{ fontSize: 18, fontWeight: 600 }}>Past weeks</span><button className="link" onClick={onClose}>Done</button></div>
      {weeks.map((w) => {
        const prayed = w.people ? w.people.length : 0;
        return (
          <div key={w.start + w.end} className="stack" style={{ gap: 6, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
            <b>{weekLabel(w.start)}</b>
            <span className="tiny sub">{Object.values(w.ticks || {}).filter(Boolean).length} of {prayed} prayed for · ended {formatShortDate(w.end)}</span>
            {(w.people || []).filter((p) => p.requests.length).map((p) => (
              <span key={p.name} className="small"><b>{p.name}:</b> {p.requests.join('; ')}</span>
            ))}
          </div>
        );
      })}
    </Sheet>
  );
}

