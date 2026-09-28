import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import {
  cardMembers, cardName, cardKind, tickKeys, groupedNames, activePoints, personName, agoText,
  formatLongDate, PRIORITIES, PRIORITY_LABEL, isPrayable, isOrg,
} from '../model.js';
import { isCardDone } from '../scheduler.js';
import { Tick, PriorityPill } from '../components/ui.jsx';
import AddPointInline from '../components/AddPointInline.jsx';
import { Back, Next, Prev, List, Cards, Pencil, Check, Clock } from '../components/Icons.jsx';

function ViewToggle({ view, onChange }) {
  return (
    <div className="seg mini" role="group" aria-label="View">
      <button aria-pressed={view === 'cards'} onClick={() => onChange('cards')}><Cards size={15} />Cards</button>
      <button aria-pressed={view === 'list'} onClick={() => onChange('list')}><List size={15} />List</button>
    </div>
  );
}

export default function Pray({ nav }) {
  const store = useStore();
  const { people, cards, settings, session, prayedToday, setIndex, setView, keepPraying, addExtraCard } = store;
  const [noneLeft, setNoneLeft] = useState(false);
  // The card sliding away while the next slides in: { id, dir, from }.
  const [leaving, setLeaving] = useState(null);
  const leaveTimer = useRef(null);
  const [drag, setDrag] = useState(null); // finger position while swiping: { x, active }
  const goRef = useRef(null);
  const prevDone = useRef(null);
  // The finish screen waits until you move on from the last card (no jumping
  // ahead the moment you tick), unless you open the screen already finished.
  const [finishAsked, setFinishAsked] = useState(() => !!session && !session.keepGoing && prayedToday >= Math.min(settings.limit, session.list.length));
  const touch = useRef(null);

  // Today's cards, leaving out any deleted or archived since the day began.
  const list = (session?.list || [])
    .map((id) => cards.find((c) => c.id === id))
    .filter((c) => c && (isPrayable(c, people) || isCardDone(c, people, session.ticks)));

  useEffect(() => { if (!session) nav.go('home'); }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // Once a card is marked as prayed, pause a moment, then move on by itself.
  const current = session && list.length ? list[Math.min(session.index || 0, list.length - 1)] : null;
  const currentDone = current ? isCardDone(current, people, session.ticks) : false;
  const inCards = session?.view !== 'list';
  useEffect(() => {
    const prev = prevDone.current;
    prevDone.current = { id: current?.id, done: currentDone };
    if (!current || !inCards || !prev || prev.id !== current.id || prev.done || !currentDone) return undefined;
    const t = setTimeout(() => goRef.current?.(1), 1800);
    return () => clearTimeout(t);
  }, [current?.id, currentDone, inCards]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null;

  const limit = settings.limit;
  const target = Math.min(limit, list.length);
  const extra = Math.max(0, prayedToday - limit);
  const finishReady = !session.keepGoing && list.length > 0 && prayedToday >= target;
  const showFinish = noneLeft || (finishReady && finishAsked);
  const view = session.view === 'list' ? 'list' : 'cards';

  if (list.length === 0) {
    return (
      <div className="screen">
        <div className="topbar"><button className="back" onClick={() => nav.go('home')}><Back />Home</button></div>
        <div className="surface empty">Nobody is due for prayer today. Add people from the People screen, or come back tomorrow.</div>
      </div>
    );
  }

  if (showFinish) {
    return (
      <Finish list={list} everyone={noneLeft} onKeep={() => { setFinishAsked(false); if (!keepPraying()) setNoneLeft(true); }}
        onDone={() => nav.go('home')} />
    );
  }

  const index = Math.min(session.index || 0, list.length - 1);
  const card = list[index];
  const done = (c) => isCardDone(c, people, session.ticks);

  const go = (dir, from = 0) => {
    setDrag(null);
    if (finishReady && dir > 0) { setFinishAsked(true); return; }
    setLeaving({ id: card.id, dir, from });
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setLeaving(null), 700);
    if (dir > 0 && index === list.length - 1) {
      if (session.keepGoing) {
        if (!addExtraCard()) setNoneLeft(true);
        return;
      }
      const firstOpen = list.findIndex((c) => !done(c));
      setIndex(firstOpen >= 0 ? firstOpen : 0);
      return;
    }
    setIndex((index + dir + list.length) % list.length);
  };
  goRef.current = go;

  // Swiping: the card follows your finger, then slides away (or springs back).
  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, horizontal: null }; };
  const onTouchMove = (e) => {
    const t = touch.current;
    if (!t) return;
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (t.horizontal == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) t.horizontal = Math.abs(dx) > Math.abs(dy);
    if (t.horizontal) setDrag({ x: dx, active: true });
  };
  const onTouchEnd = (e) => {
    const t = touch.current;
    touch.current = null;
    if (!t || !t.horizontal) return;
    const dx = e.changedTouches[0].clientX - t.x;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1, dx);
    else setDrag({ x: 0, active: false });
  };
  const outgoing = leaving && leaving.id !== card.id ? list.find((c) => c.id === leaving.id) : null;

  const counter = extra > 0 || (session.keepGoing && prayedToday >= limit)
    ? <span style={{ fontWeight: 600 }}>{limit} <span className="counter-extra">+{extra}</span></span>
    : <span><b>{prayedToday}</b> of {target}</span>;

  const topbar = (
    <div className="topbar">
      <button className="back" onClick={() => nav.go('home')}><Back />Home</button>
      {view === 'cards' && (
        <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
          <div style={{ fontSize: 15 }}>{counter}</div>
          {extra > 0 && <div className="tiny" style={{ opacity: 0.8 }}>{prayedToday} prayed today</div>}
        </div>
      )}
      <ViewToggle view={view} onChange={setView} />
    </div>
  );

  if (view === 'list') {
    return (
      <div className="screen">
        {topbar}
        <div className="spread" style={{ padding: '0 4px', alignItems: 'baseline' }}>
          <h1 className="title" style={{ fontSize: 34 }}>Today</h1>
          <span className="small">{counter} prayed</span>
        </div>
        <div className="list cream">
          {list.map((c, i) => <ListRow key={c.id} card={c} onOpen={() => { setIndex(i); setView('cards'); }} />)}
        </div>
        {finishReady && <button className="btn white" onClick={() => setFinishAsked(true)}><Check size={18} />Finish</button>}
      </div>
    );
  }

  return (
    <div className="screen fixed" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
      {topbar}
      <div className="pray-stage">
        {outgoing && (
          <div key={`out-${outgoing.id}`} className={`pray-card card-out-${leaving.dir > 0 ? 'left' : 'right'}`}
            style={{ '--from': `${leaving.from}px` }} aria-hidden="true">
            <PrayerCard card={outgoing} onEdit={() => {}} />
          </div>
        )}
        <div key={card.id} className={`pray-card ${outgoing ? `card-in-${leaving.dir > 0 ? 'right' : 'left'}` : ''}`}
          style={drag ? { transform: `translateX(${drag.x}px)`, transition: drag.active ? 'none' : 'transform .25s ease-out' } : undefined}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={() => { touch.current = null; setDrag(null); }}>
          <PrayerCard card={card} onEdit={() => nav.edit(card.id)} />
        </div>
      </div>
      <PrayerFoot card={card} onNext={() => go(1)} onPrev={() => go(-1)} />
    </div>
  );
}

function PrayerCard({ card, onEdit }) {
  const { people, session, date, toggleTick } = useStore();
  const members = cardMembers(card, people);
  const keys = tickKeys(card, people);
  const ticks = session.ticks[card.id] || {};
  const solo = !card.isGroup;
  const person = solo ? members[0] : null;
  const showMembers = card.isGroup || keys.length > 1;
  const earlier = (card.prayed || []).filter((d) => d !== date);
  const last = earlier[earlier.length - 1];
  const pointTarget = solo && person ? { kind: 'person', id: person.id } : { kind: 'card', id: card.id };
  const mainPoints = solo && person ? activePoints(person.points) : activePoints(card.points);
  const org = solo && person && !isOrg(person) ? person.organisation : '';

  return (
    <>
      <div className="pray-head">
        <div className="spread">
          <PriorityPill priority={card.priority} everyDay={card.priority === 'high' && card.everyDay} />
          <button className="icon-btn" style={{ background: 'rgba(255,255,255,.18)', width: 40, height: 40, margin: '-4px -4px -4px 0' }} onClick={onEdit} aria-label="Edit card"><Pencil /></button>
        </div>
        <h2 className={`pray-name ${cardKind(card, people) === 'org' ? 'italic' : ''}`}>{cardName(card, people)}</h2>
        <div className="pray-meta">
          {org && <span className="org">{org}</span>}
          <span className="when"><Clock />{last ? `Last prayed ${agoText(last, date).toLowerCase()}` : 'First time praying for this card'}</span>
        </div>
      </div>

      <div className="pray-body cream">
        {showMembers && (
          <div>
            {members.filter((p) => p.ownTick).map((p) => (
              <button key={p.id} className="member" onClick={() => toggleTick(card.id, p.id)}>
                <Tick on={!!ticks[p.id]} />
                <span className="stack" style={{ gap: 3 }}>
                  <span className="member-name">{p.firstName || personName(p)}</span>
                  {!solo && activePoints(p.points).map((pt) => (
                    <span key={pt.id} className="read sub" style={{ fontSize: 'calc(var(--point-size) - 2px)', lineHeight: 1.4 }}>{pt.text}</span>
                  ))}
                </span>
              </button>
            ))}
            {keys.includes('_group') && (
              <button className="member" onClick={() => toggleTick(card.id, '_group')}>
                <Tick on={!!ticks._group} />
                <span className="member-name" style={{ opacity: 0.85 }}>{groupedNames(card, people)}</span>
              </button>
            )}
          </div>
        )}

        {mainPoints.length > 0 && (
          <div className="stack" style={{ gap: 10, marginTop: showMembers ? 4 : 0 }}>
            {mainPoints.map((pt) => (
              <div key={pt.id} className="point">
                <span className="bullet" />
                <span className="point-text">{pt.text}</span>
              </div>
            ))}
          </div>
        )}

        <AddPointInline key={card.id} target={pointTarget} />
      </div>
    </>
  );
}

function PrayerFoot({ card, onNext, onPrev }) {
  const { people, session, setCardPrayed } = useStore();
  const done = isCardDone(card, people, session.ticks);
  const many = card.isGroup || tickKeys(card, people).length > 1;
  return (
    <div className="pray-foot">
      <button className="next-btn" onClick={onPrev} aria-label="Previous card"><Prev /></button>
      <button className={`pray-main ${done ? 'done' : ''}`} onClick={() => setCardPrayed(card.id, !done)}>
        <span className="check"><Check size={18} /></span>{done ? 'Prayed' : many ? 'Prayed for all' : 'Mark as prayed'}
      </button>
      <button className="next-btn" onClick={onNext} aria-label="Next card"><Next /></button>
    </div>
  );
}

function ListRow({ card, onOpen }) {
  const { people, session, setCardPrayed } = useStore();
  const done = isCardDone(card, people, session.ticks);
  return (
    <div className="list-row" style={{ minHeight: 50 }}>
      <button onClick={() => setCardPrayed(card.id, !done)} aria-label={done ? 'Mark as not prayed' : 'Mark as prayed'} style={{ padding: '8px 0' }}>
        <Tick on={done} small />
      </button>
      <button className={`grow ${cardKind(card, people) === 'org' ? 'italic' : ''}`} style={{ textAlign: 'left', minHeight: 44, fontWeight: 500, opacity: done ? 0.55 : 1 }} onClick={onOpen}>
        {cardName(card, people)}
      </button>
      <span className={`dot dot-${card.priority}`} style={{ width: 9, height: 9 }} />
    </div>
  );
}

function Finish({ list, everyone, onKeep, onDone }) {
  const { people, session, date, prayedToday } = useStore();
  const prayed = list.filter((c) => isCardDone(c, people, session.ticks));
  const counts = PRIORITIES.map((p) => [p, prayed.filter((c) => c.priority === p).length]).filter(([, n]) => n);
  return (
    <div className="screen" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 'calc(env(safe-area-inset-top) + 90px)', gap: 16 }}>
      <div style={{ position: 'relative', width: 170, height: 170 }}>
        <svg width="170" height="170" viewBox="0 0 170 170" aria-hidden="true">
          <circle cx="85" cy="85" r="72" fill="rgba(255,255,255,.1)" stroke="var(--ring)" strokeWidth="12" />
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={60} /></span>
      </div>
      <h1 className="title" style={{ fontSize: 38, marginTop: 8 }}>
        {everyone ? 'You’ve prayed for everyone today' : `All ${prayedToday} prayed for`}
      </h1>
      <div style={{ opacity: 0.85 }}>{formatLongDate(date)}</div>
      <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
        {counts.map(([p, n]) => <span key={p} className="pill"><span className={`dot dot-${p}`} />{n} {PRIORITY_LABEL[p]}</span>)}
      </div>
      <div className="stack full" style={{ marginTop: 'auto', gap: 10 }}>
        {!everyone && <button className="btn white" onClick={onKeep}>Keep praying <span style={{ color: 'var(--acc)', display: 'flex' }}><Next size={18} /></span></button>}
        <button className="btn secondary" onClick={onDone}>Done</button>
        <span className="small" style={{ marginTop: 6, opacity: 0.8 }}>
          {everyone ? 'Tomorrow’s cards will be ready in the morning.' : 'Keep going as long as you like. Extras count too.'}
        </span>
      </div>
    </div>
  );
}
