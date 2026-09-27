import { useEffect, useRef, useState } from 'react';
import { PRIORITIES, PRIORITY_LABEL } from '../model.js';
import { Back, Check, Users, Building } from './Icons.jsx';

export function TopBar({ onBack, backLabel = 'Back', right }) {
  return (
    <div className="topbar">
      {onBack ? <button className="back" onClick={onBack}><Back />{backLabel}</button> : <span />}
      {right || <span />}
    </div>
  );
}

export function Segmented({ options, value, onChange, onPage = false, label }) {
  return (
    <div className={`seg ${onPage ? 'on-page' : 'on-card'}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)} style={o.style}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PriorityPicker({ value, onChange }) {
  return (
    <div className="seg on-card" role="group" aria-label="Priority">
      {PRIORITIES.map((p) => (
        <button key={p} aria-pressed={value === p} onClick={() => onChange(p)}
          style={value === p ? { background: `var(--${p})`, color: '#fff', boxShadow: 'none' } : undefined}>
          {PRIORITY_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

export const PriorityPill = ({ priority, small, everyDay }) => (
  <span className="pill" style={small ? { fontSize: 11, padding: '3px 9px 3px 7px' } : undefined}>
    <span className={`dot dot-${priority}`} />
    {small ? PRIORITY_LABEL[priority] : `${PRIORITY_LABEL[priority]} priority`}{everyDay ? ' · every day' : ''}
  </span>
);

export function Switch({ checked, onChange, label }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function Tick({ on, small }) {
  return <span className={`tick ${on ? 'on' : ''} ${small ? 'sm' : ''}`}>{on && <Check size={small ? 14 : 16} />}</span>;
}

export function Avatar({ kind, name, priority }) {
  if (kind === 'person') {
    const initials = name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return <span className="avatar person">{initials || '?'}</span>;
  }
  return (
    <span className={`avatar solid-${priority}`}>
      {kind === 'group' ? <Users size={20} /> : <Building size={19} />}
    </span>
  );
}

export function Sheet({ onClose, children, label }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, message, confirmLabel, danger, onConfirm, onCancel, extra }) {
  return (
    <div className="overlay center" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
        {message && <div className="sub" style={{ lineHeight: 1.5 }}>{message}</div>}
        {extra}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn soft small" onClick={onCancel}>Cancel</button>
          <button className={`btn small ${danger ? '' : 'accent'}`} style={danger ? { background: 'var(--danger)', color: '#fff' } : undefined}
            onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// Text area that grows with its content.
export function AutoText({ value, onChange, onBlur, placeholder, className = 'pt-edit', onEnter, autoFocus }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea ref={ref} rows={1} className={className} value={value} placeholder={placeholder} autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
      onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }} />
  );
}

export function useConfirm() {
  const [state, setState] = useState(null);
  const ask = (opts) => setState(opts);
  const node = state && (
    <Confirm {...state}
      onCancel={() => setState(null)}
      onConfirm={() => { setState(null); state.onConfirm(); }} />
  );
  return [ask, node];
}
