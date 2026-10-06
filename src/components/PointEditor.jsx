import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import { activePoints, pointPrayedDates, deletePointMessage } from '../model.js';
import { AutoText, useConfirm } from './ui.jsx';
import { Grip, Check, Trash, Plus } from './Icons.jsx';
import AnsweredNote from './AnsweredNote.jsx';

// Edit a list of prayer points: change the words, drag to reorder,
// mark answered, delete (kept in history), or add new ones.
export default function PointEditor({ target, points, placeholder = 'Add a prayer point', label }) {
  const { people, cards, addPoint, setPointText, movePoint, answerPoint, removePoint } = useStore();
  const [ask, confirmNode] = useConfirm();
  const confirmDelete = (pt) => ask({
    title: 'Delete this prayer point?',
    message: deletePointMessage(pt, pointPrayedDates(target, people, cards)),
    confirmLabel: 'Delete',
    danger: true,
    onConfirm: () => removePoint(target, pt),
  });
  const active = activePoints(points);
  const [draft, setDraft] = useState('');
  const [drag, setDrag] = useState(null); // { id, from, dy, rowH }
  const [answering, setAnswering] = useState(null); // point id showing the answered note box

  const add = () => {
    if (!draft.trim()) return;
    addPoint(target, draft);
    setDraft('');
  };

  const onGripDown = (e, id, index) => {
    const row = e.currentTarget.closest('.pt-row');
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id, from: index, startY: e.clientY, dy: 0, rowH: row ? row.offsetHeight : 50 });
  };
  const onGripMove = (e) => {
    if (!drag) return;
    setDrag({ ...drag, dy: e.clientY - drag.startY });
  };
  const onGripUp = () => {
    if (!drag) return;
    const to = Math.max(0, Math.min(active.length - 1, drag.from + Math.round(drag.dy / drag.rowH)));
    if (to !== drag.from) movePoint(target, drag.id, to);
    setDrag(null);
  };

  return (
    <div className="stack" style={{ gap: 0 }}>
      {label && <span className="label" style={{ marginBottom: 4 }}>{label}</span>}
      {active.map((pt, i) => (
        <div key={pt.id}>
        <div className={`pt-row ${drag?.id === pt.id ? 'dragging' : ''}`}
          style={drag?.id === pt.id ? { transform: `translateY(${drag.dy}px)` } : undefined}>
          {active.length > 1 && (
            <span className="grip" aria-label="Drag to reorder" role="button"
              onPointerDown={(e) => onGripDown(e, pt.id, i)} onPointerMove={onGripMove}
              onPointerUp={onGripUp} onPointerCancel={() => setDrag(null)}>
              <Grip />
            </span>
          )}
          <PointText point={pt} onSave={(text) => setPointText(target, pt.id, text)} />
          <button className="chip-btn" onClick={() => setAnswering(answering === pt.id ? null : pt.id)} aria-label={`Mark "${pt.text}" as answered`}>
            <Check size={14} />Answered
          </button>
          <button className="icon-btn" style={{ width: 38, height: 38 }} onClick={() => confirmDelete(pt)} aria-label={`Delete "${pt.text}"`}>
            <Trash />
          </button>
        </div>
        {answering === pt.id && (
          <div style={{ padding: '8px 0 10px' }}>
            <AnsweredNote onCancel={() => setAnswering(null)} onDone={(note) => { setAnswering(null); answerPoint(target, pt, note); }} />
          </div>
        )}
        </div>
      ))}
      <div className="row" style={{ marginTop: 8, gap: 8 }}>
        <input className="input" style={{ borderStyle: 'dashed', background: 'transparent' }} value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} aria-label={placeholder} />
        <button className="btn accent" style={{ width: 46, height: 46, padding: 0, borderRadius: 12, flexShrink: 0 }} onClick={add} aria-label="Add prayer point">
          <Plus size={18} />
        </button>
      </div>
      {confirmNode}
    </div>
  );
}

function PointText({ point, onSave }) {
  const [text, setText] = useState(point.text);
  const saved = useRef(point.text);
  useEffect(() => { setText(point.text); saved.current = point.text; }, [point.text]);
  const commit = () => {
    const t = text.trim();
    if (!t) { setText(saved.current); return; }
    if (t !== saved.current) onSave(t);
  };
  return <AutoText value={text} onChange={setText} onBlur={commit} onEnter={(e) => document.activeElement?.blur()} />;
}
