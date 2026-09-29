import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

// A page's big heading: "Prayer points for" with whose they are underneath.
export function PageHeading({ kicker, name, italic }) {
  return (
    <div className="stack" style={{ gap: 2, padding: '0 4px' }}>
      <span className="small" style={{ opacity: 0.9 }}>{kicker}</span>
      <h1 className={`title ${italic ? 'italic' : ''}`} style={{ lineHeight: 1.05 }}>{name}</h1>
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

// How much of the screen the on-screen keyboard is covering.
function useKeyboardHeight() {
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => setKb(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  return kb;
}

export function Sheet({ onClose, children, label }) {
  const kb = useKeyboardHeight();
  const sheetRef = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  // When the keyboard opens, keep the box being typed in visible.
  useEffect(() => {
    if (!kb) return;
    const el = document.activeElement;
    if (el && sheetRef.current?.contains(el)) setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 50);
  }, [kb]);
  // Drawn above the scrolling screens so the bottom fade never touches it,
  // and lifted above the on-screen keyboard.
  return createPortal(
    <div className="overlay" onClick={onClose} style={kb ? { paddingBottom: kb } : undefined}>
      <div ref={sheetRef} className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        style={kb ? { maxHeight: `calc((100dvh - ${kb}px - 24px) / var(--z, 1))`, borderRadius: 28, paddingBottom: 16 } : undefined}>
        <div className="handle" />
        {children}
      </div>
    </div>,
    document.body
  );
}

export function Confirm({ title, message, confirmLabel, danger, onConfirm, onCancel, extra }) {
  return createPortal(
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
    </div>,
    document.body
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

// One line of big text that shrinks to fit the width instead of wrapping.
export function FitText({ as: Tag = 'span', size, min = 24, className, style, children }) {
  const ref = useRef(null);
  const [fs, setFs] = useState(size);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      el.style.fontSize = `${size}px`;
      const avail = el.clientWidth;
      const need = el.scrollWidth;
      const next = need > avail ? Math.max(min, Math.floor(size * (avail / need) * 10) / 10) : size;
      el.style.fontSize = `${next}px`;
      setFs(next);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement || el);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [size, min, children]);
  return <Tag ref={ref} className={className} style={{ ...style, fontSize: fs, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</Tag>;
}
