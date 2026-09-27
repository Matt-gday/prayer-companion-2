import { TopBar } from '../components/ui.jsx';

const SECTIONS = [
  ['How each day works', 'You choose how many cards to pray for each day in Settings. Each day the app picks that many, starting with whoever has waited longest for their priority. If you miss a few days, nothing piles up: tomorrow is still the same number.'],
  ['Priorities', 'High cards come up most often, then Medium, Low and Occasional. Settings shows roughly how often each one comes up at your daily number. Change a card’s priority any time from its pencil button.'],
  ['Every day', 'Turn on Every day for a High card to include it every day. Every-day cards use up places in your daily number, so the app warns you if they fill it.'],
  ['Praying', 'Tick each name as you pray, or tap Mark as prayed. Swipe or use the arrows to move between cards. Tap the list button to see today as a list.'],
  ['Keep praying', 'When you finish your cards, tap Keep praying to carry on with the next ones for as long as you like. The counter shows your extras in green, like 15 +3.'],
  ['Changing the daily number', 'You can change it any time, even part way through a day. Cards you’ve prayed for stay prayed for. Raising it adds more cards; lowering it takes away ones you haven’t prayed for yet.'],
  ['Prayer points', 'Tap the pencil on any card to add, edit, reorder, mark answered or delete prayer points. Answered and deleted points stay in the card’s history.'],
  ['Families and groups', 'Groups share one card. Each adult can have their own tick box and prayer points, and children can share a tick box. Add someone to a card from its pencil button, or split a group into individual cards.'],
  ['History', 'Open a card from People to see how often you’ve prayed, answered prayers, past prayer points and a 12-week calendar. Tap a day to see what you were praying for.'],
  ['Backups', 'Everything is saved on this phone only. Download a backup from Settings about once a month, and before changing phones. You can restore it here or on another device.'],
];

export default function Help({ nav }) {
  return (
    <div className="screen">
      <TopBar onBack={() => nav.go('settings')} backLabel="Settings" />
      <h1 className="title" style={{ padding: '0 4px' }}>How to use the app</h1>
      {SECTIONS.map(([title, text]) => (
        <div key={title} className="surface stack" style={{ gap: 6 }}>
          <span style={{ fontWeight: 600 }}>{title}</span>
          <span className="sub" style={{ lineHeight: 1.55 }}>{text}</span>
        </div>
      ))}
    </div>
  );
}
