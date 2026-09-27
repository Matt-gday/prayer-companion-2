import { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { formatLongDate, PRIORITIES, PRIORITY_LABEL, isPrayable, daysBetween } from '../model.js';
import { buildList, everyDayCheck } from '../scheduler.js';
import { Sliders, Next, Users, Download, Plus } from '../components/Icons.jsx';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function Home({ nav }) {
  const { people, cards, settings, session, date, startToday, keepPraying, prayedToday } = useStore();
  const limit = settings.limit;
  const prayable = cards.filter((c) => isPrayable(c, people));

  const todayList = useMemo(
    () => (session ? session.list : buildList(cards, people, date, limit)),
    [session, cards, people, date, limit]
  );
  const counts = PRIORITIES.map((p) => [p, todayList.filter((id) => cards.find((c) => c.id === id)?.priority === p).length])
    .filter(([, n]) => n > 0);

  const extra = Math.max(0, prayedToday - limit);
  const done = session && prayedToday >= Math.min(limit, todayList.length) && todayList.length > 0;
  const everyDay = everyDayCheck(cards, people, limit);

  const begin = () => {
    startToday();
    if (done) keepPraying();
    nav.go('pray');
  };

  const backupAge = settings.lastBackup ? daysBetween(settings.lastBackup, date) : null;
  const backupText = backupAge == null ? 'Not saved yet' : backupAge === 0 ? 'Saved today' : `Last saved ${backupAge} day${backupAge === 1 ? '' : 's'} ago`;

  return (
    <div className="screen" style={{ gap: 20 }}>
      <div className="spread" style={{ marginTop: 8 }}>
        <span className="sub small">{formatLongDate(date)}{settings.demo ? ' · Demo mode' : ''}</span>
        <button className="icon-btn filled" onClick={() => nav.go('settings')} aria-label="Settings"><Sliders /></button>
      </div>

      <h1 className="title big-title">{greeting()}{settings.name ? `, ${settings.name}` : ''}</h1>

      {prayable.length === 0 ? (
        <div className="surface stack" style={{ padding: 22, borderRadius: 24, gap: 14 }}>
          <div className="title" style={{ fontSize: 26 }}>Who would you like to pray for?</div>
          <p className="sub" style={{ lineHeight: 1.5 }}>Add the people, families and organisations on your heart. Each day you'll get a few of them to pray for.</p>
          <button className="btn primary" onClick={nav.add}><Plus size={18} />Add someone</button>
          <button className="link" onClick={() => nav.go('settings')}>Or restore a backup in Settings</button>
        </div>
      ) : (
        <div className="surface stack" style={{ padding: 22, borderRadius: 24, gap: 16 }}>
          <div className="spread">
            <span className="sub">Today</span>
            {session && (
              <span className="sub small">
                {extra > 0
                  ? <>{limit} <span className="counter-extra" style={{ fontWeight: 600 }}>+{extra}</span> prayed</>
                  : done ? `${prayedToday} prayed` : `${prayedToday} of ${Math.min(limit, todayList.length)} prayed`}
              </span>
            )}
          </div>
          <div className="title" style={{ fontSize: 30 }}>
            {!session && `${todayList.length} card${todayList.length === 1 ? '' : 's'} for today`}
            {session && !done && `${Math.min(limit, todayList.length) - prayedToday} card${Math.min(limit, todayList.length) - prayedToday === 1 ? '' : 's'} to go`}
            {session && done && (extra > 0 ? `${prayedToday} prayed for today` : `All ${prayedToday} prayed for`)}
          </div>
          {session && (
            <div className="progress"><div style={{ width: `${Math.min(100, (prayedToday / Math.max(1, Math.min(limit, todayList.length))) * 100)}%` }} /></div>
          )}
          {counts.length > 0 && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {counts.map(([p, n]) => <span key={p} className={`pill pill-${p}`} style={{ fontSize: 13 }}>{PRIORITY_LABEL[p]} {n}</span>)}
            </div>
          )}
          <button className="btn primary" onClick={begin}>
            {!session ? 'Start praying' : done ? 'Keep praying' : 'Continue praying'} <Next size={18} />
          </button>
        </div>
      )}

      {everyDay.full && (
        <div className="warn">
          You have {everyDay.count} every-day cards and pray for {limit} a day, so there's no room for anyone else.
          Raise your daily number in <button className="link" style={{ minHeight: 0, fontSize: 13, color: 'inherit', textDecoration: 'underline' }} onClick={() => nav.go('settings')}>Settings</button> or turn off Every day on some cards.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <button className="surface stack" style={{ textAlign: 'left', gap: 8, padding: 18 }} onClick={() => nav.go('people')}>
          <span style={{ color: 'var(--acc)' }}><Users size={22} /></span>
          <span style={{ fontSize: 16, fontWeight: 500 }}>People</span>
          <span className="sub small">{prayable.length} card{prayable.length === 1 ? '' : 's'}</span>
        </button>
        <button className="surface stack" style={{ textAlign: 'left', gap: 8, padding: 18 }} onClick={() => nav.go('settings')}>
          <span style={{ color: 'var(--acc)' }}><Download size={22} /></span>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Backup</span>
          <span className={`small ${backupAge == null || backupAge > 30 ? '' : 'sub'}`} style={backupAge == null || backupAge > 30 ? { color: 'var(--warn-ink)' } : undefined}>{backupText}</span>
        </button>
      </div>

      <button className="muted small" style={{ marginTop: 'auto', minHeight: 44 }} onClick={() => nav.go('settings')}>
        Praying for {limit} cards a day
      </button>
    </div>
  );
}
