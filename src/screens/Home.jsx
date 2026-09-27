import { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { formatLongDate, PRIORITIES, PRIORITY_LABEL, isPrayable, daysBetween, cardName } from '../model.js';
import { buildList, everyDayCheck, isCardDone, nextCards } from '../scheduler.js';
import { greetingFor } from '../skies.js';
import { Next, Users, Download, Plus, Cog } from '../components/Icons.jsx';

export default function Home({ nav }) {
  const { people, cards, settings, session, date, startToday, keepPraying, prayedToday } = useStore();
  const limit = settings.limit;
  const prayable = cards.filter((c) => isPrayable(c, people));

  const todayList = useMemo(
    () => (session ? session.list : buildList(cards, people, date, limit)),
    [session, cards, people, date, limit]
  );
  const target = Math.min(limit, todayList.length);
  const extra = Math.max(0, prayedToday - limit);
  const started = !!session && prayedToday > 0;
  const done = !!session && target > 0 && prayedToday >= target;
  const everyDay = everyDayCheck(cards, people, limit);

  // Who's next: the first card still to pray for, or the next extra card.
  const find = (id) => cards.find((c) => c.id === id);
  let nextId = null;
  if (!session) nextId = todayList[0];
  else {
    const n = session.list.length;
    for (let k = 0; k < n; k++) {
      const c = find(session.list[(session.index + k) % n]);
      if (c && isPrayable(c, people) && !isCardDone(c, people, session.ticks)) { nextId = c.id; break; }
    }
    if (!nextId && done) nextId = nextCards(cards, people, date, session.list, 1)[0];
  }
  const nextName = nextId && find(nextId) ? cardName(find(nextId), people) : '';

  const counts = PRIORITIES.map((p) => [p, todayList.filter((id) => find(id)?.priority === p).length]).filter(([, n]) => n > 0);

  const begin = () => {
    startToday();
    if (done) keepPraying();
    nav.go('pray');
  };

  const title = !started ? 'Begin praying' : done ? 'Keep praying' : 'Continue praying';
  const subtitle = !started
    ? (nextName ? `Start with ${nextName}` : '')
    : done
      ? (nextName ? `All ${prayedToday} prayed · next: ${nextName}` : 'You’ve prayed for everyone today')
      : `Next: ${nextName}`;

  // Progress ring
  const R = 88;
  const C = 2 * Math.PI * R;
  const frac = target ? Math.min(1, prayedToday / target) : 0;

  const backupAge = settings.lastBackup ? daysBetween(settings.lastBackup, date) : null;
  const backupText = backupAge == null ? 'Not saved yet' : backupAge === 0 ? 'Saved today' : `${backupAge} day${backupAge === 1 ? '' : 's'} ago`;

  return (
    <div className="screen" style={{ gap: 16 }}>
      <div className="spread" style={{ marginTop: 4 }}>
        <span className="small" style={{ opacity: 0.95 }}>{formatLongDate(date)}{settings.demo ? ' · Demo' : ''}</span>
        <button className="icon-btn glass" onClick={() => nav.go('settings')} aria-label="Settings"><Cog /></button>
      </div>

      <div>
        {settings.name && <div style={{ fontSize: 19, opacity: 0.92 }}>{greetingFor(nav.now)},</div>}
        <h1 className="title" style={{ fontSize: settings.name ? 58 : 46, lineHeight: 1.02 }}>{settings.name || greetingFor(nav.now)}</h1>
      </div>

      {prayable.length === 0 ? (
        <div className="surface stack" style={{ padding: 22, borderRadius: 24, gap: 14, marginTop: 20 }}>
          <div className="title" style={{ fontSize: 26 }}>Who would you like to pray for?</div>
          <p className="sub" style={{ lineHeight: 1.5 }}>Add the people, families and organisations on your heart. Each day you'll get a few of them to pray for.</p>
          <button className="btn white" onClick={nav.add}><Plus size={18} />Add someone</button>
          <button className="link" onClick={() => nav.go('settings', { focus: 'backup' })}>Or restore a backup</button>
        </div>
      ) : (
        <>
          <div className="home-ring" style={{ marginTop: 8 }}>
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r={R} fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.26)" strokeWidth="13" />
              {frac > 0 && (
                <circle cx="100" cy="100" r={R} fill="none" stroke="var(--ring)" strokeWidth="13" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dashoffset .6s ease' }} />
              )}
            </svg>
            <div className="centre" aria-live="polite">
              {!started ? (
                <><span className="read" style={{ fontSize: 60, fontWeight: 500, lineHeight: 1 }}>{target}</span><span className="small" style={{ opacity: 0.9 }}>cards today</span></>
              ) : extra > 0 ? (
                <><span className="read" style={{ fontSize: 50, fontWeight: 500, lineHeight: 1 }}>{limit}<span className="counter-extra" style={{ fontSize: 30 }}> +{extra}</span></span><span className="small" style={{ opacity: 0.9 }}>{prayedToday} prayed today</span></>
              ) : (
                <><span className="read" style={{ fontSize: 60, fontWeight: 500, lineHeight: 1 }}>{prayedToday}</span><span className="small" style={{ opacity: 0.9 }}>of {target} prayed</span></>
              )}
            </div>
          </div>

          {counts.length > 0 && (
            <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {counts.map(([p, n]) => <span key={p} className="pill"><span className={`dot dot-${p}`} />{PRIORITY_LABEL[p]} {n}</span>)}
            </div>
          )}

          {everyDay.full && (
            <div className="warn">
              Your {everyDay.count} every-day cards fill all {limit} places, so nobody else will come up.
              Raise your daily number in <button className="link" style={{ minHeight: 0, fontSize: 13, color: 'inherit', textDecoration: 'underline' }} onClick={() => nav.go('settings')}>Settings</button> or turn off Every day on some cards.
            </div>
          )}

          <div style={{ flex: 1 }} />

          <button className="home-go" onClick={begin}>
            <span className="stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 19, fontWeight: 600 }}>{title}</span>
              {subtitle && <span className="small" style={{ color: '#7A6A80' }}>{subtitle}</span>}
            </span>
            <span className="go" style={{ width: 56, height: 56, borderRadius: 28 }}><Next size={22} /></span>
          </button>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: prayable.length ? 0 : 'auto' }}>
        <button className="home-tile" onClick={() => nav.go('people')}>
          <span className="ic"><Users size={20} /></span>
          <span>People<small>{prayable.length} card{prayable.length === 1 ? '' : 's'}</small></span>
        </button>
        <button className="home-tile" onClick={() => nav.go('settings', { focus: 'backup' })}>
          <span className="ic"><Download size={20} /></span>
          <span>Backup<small style={backupAge == null || backupAge > 30 ? { color: '#FFE3A0', opacity: 1 } : undefined}>{backupText}</small></span>
        </button>
      </div>
    </div>
  );
}
