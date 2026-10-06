import { useState } from 'react';
import { Check } from './Icons.jsx';

// Opens in place after tapping "Answered": an optional note about how it was
// answered. "Not yet" leaves the point as it was.
export default function AnsweredNote({ onDone, onCancel }) {
  const [note, setNote] = useState('');
  return (
    <div className="answer-note">
      <span className="answer-note-label"><Check size={14} />How was it answered?</span>
      <textarea className="input" autoFocus rows={2} value={note} placeholder="Add a note (optional)" aria-label="How was it answered? (optional)"
        onChange={(e) => setNote(e.target.value)} />
      <div className="quick-actions" style={{ paddingLeft: 0 }}>
        <button className="qa qa-fill" onClick={() => onDone(note.trim())}><Check size={14} />{note.trim() ? 'Save with note' : 'Mark answered'}</button>
        <button className="qa" onClick={onCancel}>Not yet</button>
      </div>
    </div>
  );
}

// Add or change the note on a point that's already answered.
export function EditAnsweredNote({ initial = '', onSave, onCancel }) {
  const [note, setNote] = useState(initial);
  return (
    <div className="answer-note">
      <textarea className="input" autoFocus rows={2} value={note} placeholder="How was it answered?" aria-label="How was it answered?"
        onChange={(e) => setNote(e.target.value)} />
      <div className="quick-actions" style={{ paddingLeft: 0 }}>
        <button className="qa qa-fill" onClick={() => onSave(note.trim())}><Check size={14} />Save</button>
        <button className="qa" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
