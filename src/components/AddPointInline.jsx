import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Plus } from './Icons.jsx';

// "+ Add prayer point", which opens a box right where it is. Tapping away
// with nothing typed closes it again.
export default function AddPointInline({ target }) {
  const { addPoint } = useStore();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const save = () => {
    if (draft.trim()) addPoint(target, draft);
    setDraft('');
    setAdding(false);
  };

  if (!adding) {
    return <button className="link" style={{ alignSelf: 'flex-start', fontSize: 14 }} onClick={() => setAdding(true)}><Plus />Add prayer point</button>;
  }
  return (
    <div className="row" style={{ gap: 8 }}>
      <input className="input" autoFocus value={draft} placeholder="New prayer point" aria-label="New prayer point"
        onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setAdding(false); }}
        onBlur={() => { if (!draft.trim()) { setDraft(''); setAdding(false); } }} />
      <button className="btn accent small" onPointerDown={(e) => e.preventDefault()} onClick={save}>Add</button>
    </div>
  );
}
