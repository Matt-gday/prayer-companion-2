// Data shapes and small helpers shared across the app.
//
// Person: { id, firstName, lastName, organisation, isChild, ownTick, added,
//           archived, prayed: ['YYYY-MM-DD'], points: [Point] }
// Card:   { id, name, personIds, isGroup, withChildren, priority, everyDay,
//           created, archived, prayed: ['YYYY-MM-DD'], points: [Point] }
// Point:  { id, text, added, status: 'active' | 'answered' | 'removed', closed }
//
// A solo card keeps its prayer points on the person; a group card keeps
// group-wide points on the card and each member's own points on the person.

export const PRIORITIES = ['high', 'med', 'low', 'occ'];
export const PRIORITY_LABEL = { high: 'High', med: 'Medium', low: 'Low', occ: 'Occasional' };

export const newId = () => Math.random().toString(36).slice(2, 11);

export const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// A prayer day runs from 3am to 3am, so praying after midnight still
// counts as the day before.
export const DAY_START_HOUR = 3;
export const prayerDate = (d = new Date()) => toISODate(new Date(d.getTime() - DAY_START_HOUR * 3600000));
export const today = () => prayerDate();

const parse = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const daysBetween = (fromIso, toIso) => Math.round((parse(toIso) - parse(fromIso)) / 86400000);

export const addDays = (iso, n) => {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

export const formatLongDate = (iso) =>
  parse(iso).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

export const formatShortDate = (iso) =>
  parse(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatMonthYear = (iso) =>
  parse(iso).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });

export const agoText = (iso, now = today()) => {
  if (!iso) return 'Not prayed for yet';
  const d = daysBetween(iso, now);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
};

// Was this point ever prayed for? True if its card was prayed on any day
// while the point was active.
export const everPrayed = (pt, dates) => (dates || []).some((d) => d >= pt.added && d <= (pt.closed || '9999-12-31'));

export const newPoint = (text, date = today()) => ({ id: newId(), text: text.trim(), added: date, status: 'active', closed: null });

export const splitLines = (text) => (text || '').split('\n').map((l) => l.trim()).filter(Boolean);

export const isOrg = (p) => !!p && !p.firstName && !p.lastName && !!p.organisation;

export const personName = (p) => {
  if (!p) return '';
  const full = `${p.firstName || ''} ${p.lastName || ''}`.trim();
  return full || p.organisation || 'Unnamed';
};

export const cardMembers = (card, people) =>
  card.personIds.map((id) => people.find((p) => p.id === id)).filter((p) => p && !p.archived);

export const cardName = (card, people) => {
  if (card.isGroup) return card.name || 'Unnamed group';
  const p = people.find((x) => x.id === card.personIds[0]);
  return personName(p) || card.name || 'Unnamed';
};

export const cardKind = (card, people) => {
  if (card.isGroup) return 'group';
  const p = people.find((x) => x.id === card.personIds[0]);
  return isOrg(p) ? 'org' : 'person';
};

export const lastPrayed = (card) => (card.prayed && card.prayed.length ? card.prayed[card.prayed.length - 1] : null);

// A card can come up for prayer if it's not archived and has someone to pray for.
export const isPrayable = (card, people) =>
  !card.archived && (cardMembers(card, people).length > 0 || card.withChildren);

// The tick boxes a card shows while praying: one per member with their own
// tick, plus one shared '_group' box for children without their own tick and
// the "and children" option.
export const tickKeys = (card, people) => {
  const members = cardMembers(card, people);
  const keys = members.filter((p) => p.ownTick).map((p) => p.id);
  if (members.some((p) => !p.ownTick) || card.withChildren) keys.push('_group');
  return keys;
};

export const groupedNames = (card, people) => {
  const names = cardMembers(card, people).filter((p) => !p.ownTick).map((p) => p.firstName || personName(p));
  if (card.withChildren) names.push(names.length ? 'children' : 'and children');
  return names.join(', ').replace(/, children$/, ' and children');
};

export const activePoints = (points) => (points || []).filter((pt) => pt.status === 'active');

export const addDate = (dates, date) => (dates.includes(date) ? dates : [...dates, date].sort());
export const removeDate = (dates, date) => dates.filter((d) => d !== date);
