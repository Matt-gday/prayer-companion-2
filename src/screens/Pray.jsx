import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.jsx';
import {
  cardMembers, cardName, cardKind, tickKeys, groupedNames, activePoints, personName, agoText,
  formatLongDate, PRIORITIES, PRIORITY_LABEL, isPrayable, isOrg,
} from '../model.js';
import { isCardDone, isEveryDay } from '../scheduler.js';
import { Tick } from '../components/ui.jsx';
import { Back, Next, Prev, List, Cards, Pencil, Check, Clock, Plus } from '../components/Icons.jsx';

export default function Pray({ nav }) {
  const store = useStore();
  const { people, cards, settings, session, prayedToday, setIndex, setView, keepPraying, addExtraCard } = store;
  const [slide, setSlide] = useState('');
  const [noneLeft, setNoneLeft] = useState(false);
  // The finish screen waits until you move on from the last card (no jumping
  // ahead the moment you tick), unless you open the screen already finished.
  const [finishAsked, setFinishAsked] = useState(() => !!session && !session.keepGoing && prayedToday >= Math.min(settings.limit, session.list.length));
  const touch = useRef(null);

  // Today's cards, leaving out any deleted or archived since the day began.
  const list = (session?.list || [])
    .map((id) => cards.find((c) => c.id === id))
    .filter((c) => c && (isPrayable(c, people) || isCardDone(c, people, session.ticks)));

  useEffect(() => { if (!session) nav.go('home'); }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!session) return null;

  const limit = settings.limit;
  const target = Math.min(limit, list.length);
  const extra = Math.max(0, prayedToday - limit);
  const finishReady = !session.keepGoing && list.length > 0 && prayedToday >= target;
  const showFinish = noneLeft || (finishReady && finishAsked);

  if (list.length === 0) {
    return (
      <div className="screen">
        <div className="topbar"><button className="back" onClick={() => nav.go('home')}><Back />Home</button></div>
        <div className="empty">Nobody is due for prayer today. Add people from the People screen, or come back tomorrow.</div>
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

  const go = (dir) => {
    if (finishReady && dir > 0) { setFinishAsked(true); return; }
    setSlide(dir > 0 ? 'slide-left' : 'slide-right');
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

  const counter = extra > 0 || (session.keepGoing && prayedToday >= limit)
    ? <span style={{ fontWeight: 600, color: 'var(--text)' }}>{limit} <span className="counter-extra">+{extra}</span></span>
    : <span>{prayedToday} of {target}</span>;

  if (session.view === 'list') {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="back" onClick={() => nav.go('home')}><Back />Home</button>
          <button className="btn secondary small" onClick={() => setView('cards')}><Cards size={18} />Cards</button>
        </div>
        <div className="spread" style={{ padding: '0 4px' }}>
          <h1 className="title" style={{ fontSize: 32 }}>Today</h1>
          <span className="sub small">{counter}</span>
        </div>
        <div className="list">
          {list.map((c, i) => <ListRow key={c.id} card={c} onOpen={() => { setIndex(i); setView('cards'); }} />)}
        </div>
        {finishReady && <button className="btn primary" onClick={() => setFinishAsked(true)}><Check size={18} />Finish</button>}
      </div>
    );
  }

  return (
    <div className="screen fixed" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}>
      <div className="topbar">
        <button className="back" onClick={() => nav.go('home')}><Back />Home</button>
        <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
          <div style={{ fontSize: 15 }}>{counter}</div>
          {extra > 0 && <div className="tiny">{prayedToday} prayed today</div>}
        </div>
        <button className="icon-btn" onClick={() => setView('list')} aria-label="Show as a list"><List /></button>
      </div>
      <div key={card.id} className={`pray-card ${slide}`}
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          touch.current = null;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}>
        <PrayerCard card={card} onEdit={() => nav.edit(card.id)} onNext={() => go(1)} onPrev={() => go(-1)} />
      </div>
      <div className="tiny muted" style={{ textAlign: 'center' }}>
        {extra > 0 || session.keepGoing ? 'Extra time. Stop whenever you like.' : 'Swipe or use the arrows to move between cards'}
      </div>
    </div>
  );
}

function PrayerCard({ card, onEdit, onNext, onPrev }) {
  const { people, session, date, toggleTick, setCardPrayed, addPoint } = useStore();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const members = cardMembers(card, people);
  const keys = tickKeys(card, people);
  const ticks = session.ticks[card.id] || {};
  const done = isCardDone(card, people, session.ticks);
  const solo = !card.isGroup;
  const person = solo ? members[0] : null;
  const showMembers = card.isGroup || keys.length > 1;
  const earlier = (card.prayed || []).filter((d) => d !== date);
  const last = earlier[earlier.length - 1];
  const pointTarget = solo && person ? { kind: 'person', id: person.id } : { kind: 'card', id: card.id };
  const mainPoints = solo && person ? activePoints(person.points) : activePoints(card.points);

  const saveDraft = () => {
    if (draft.trim()) addPoint(pointTarget, draft);
    setDraft('');
    setAdding(false);
  };

  return (
    <>
      <div className={`pray-head band-${card.priority}`}>
        <div className="spread">
          <span className={`pill pill-${card.priority}`}>{isEveryDay(card) ? 'Every day' : `${PRIORITY_LABEL[card.priority]} priority`}</span>
          <button className="icon-btn" style={{ background: 'var(--soft)', margin: '-6px -6px -6px 0' }} onClick={onEdit} aria-label="Edit card"><Pencil /></button>
        </div>
        <h2 className={`pray-name ${cardKind(card, people) === 'org' ? 'italic' : ''}`}>{cardName(card, people)}</h2>
        {solo && person && !isOrg(person) && person.organisation && <div className="sub small">{person.organisation}</div>}
        <div className="row muted tiny" style={{ gap: 6 }}><Clock />{last ? `Last prayed ${agoText(last, date).toLowerCase()}` : 'First time praying for this card'}</div>
      </div>

      <div className="pray-body">
        {showMembers && (
          <div>
            {members.filter((p) => p.ownTick).map((p) => (
              <button key={p.id} className="member" onClick={() => toggleTick(card.id, p.id)}>
                <Tick on={!!ticks[p.id]} />
                <span className="stack" style={{ gap: 4 }}>
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
                <span className="member-name sub">{groupedNames(card, people)}</span>
              </button>
            )}
          </div>
        )}

        {mainPoints.length > 0 && (
          <div className="stack" style={{ gap: 10, marginTop: showMembers ? 4 : 0 }}>
            {mainPoints.map((pt) => (
              <div key={pt.id} className="point">
                <span className={`dot dot-${card.priority}`} />
                <span className="point-text">{pt.text}</span>
              </div>
            ))}
          </div>
        )}

        {adding ? (
          <div className="row" style={{ gap: 8 }}>
            <input className="input" autoFocus value={draft} placeholder="New prayer point" aria-label="New prayer point"
              onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveDraft(); if (e.key === 'Escape') setAdding(false); }} />
            <button className="btn accent small" onClick={saveDraft}>Add</button>
          </div>
        ) : (
          <button className="link" style={{ alignSelf: 'flex-start', fontSize: 14 }} onClick={() => setAdding(true)}><Plus />Add prayer point</button>
        )}
      </div>

      <div className="pray-foot">
        <button className="next-btn" onClick={onPrev} aria-label="Previous card"><Prev /></button>
        <button className="btn grow" onClick={() => setCardPrayed(card.id, !done)}
          style={{ background: done ? 'var(--acc)' : 'var(--btn)', color: done ? 'var(--acc-ink)' : 'var(--btn-ink)' }}>
          <Check size={18} />{done ? 'Prayed' : showMembers && keys.length > 1 ? 'Prayed for all' : 'Mark as prayed'}
        </button>
        <button className="next-btn" onClick={onNext} aria-label="Next card"><Next /></button>
      </div>
    </>
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
      <button className={`grow ${cardKind(card, people) === 'org' ? 'italic' : ''}`} style={{ textAlign: 'left', minHeight: 44, color: done ? 'var(--muted)' : 'var(--text)' }} onClick={onOpen}>
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
    <div className="screen" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 'calc(env(safe-area-inset-top) + 110px)', gap: 18 }}>
      <div style={{ width: 96, height: 96, borderRadius: 48, background: 'var(--acc)', color: 'var(--acc-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={46} />
      </div>
      <h1 className="title" style={{ fontSize: 36, marginTop: 10 }}>
        {everyone ? "You've prayed for everyone today" : `All ${prayedToday} prayed for`}
      </h1>
      <div className="sub">{formatLongDate(date)}</div>
      <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {counts.map(([p, n]) => <span key={p} className={`pill pill-${p}`} style={{ fontSize: 13 }}>{n} {PRIORITY_LABEL[p]}</span>)}
      </div>
      <div className="stack full" style={{ marginTop: 'auto', gap: 10 }}>
        {!everyone && <button className="btn secondary" onClick={onKeep}>Keep praying <Next size={18} /></button>}
        <button className="btn primary" onClick={onDone}>Done</button>
        <span className="small muted" style={{ marginTop: 6 }}>
          {everyone ? 'Tomorrow’s cards will be ready in the morning.' : 'Keep going as long as you like. Extras count too.'}
        </span>
      </div>
    </div>
  );
}
