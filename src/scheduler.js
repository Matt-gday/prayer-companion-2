// Choosing which cards come up each day.
//
// Every card has a priority. Each day the app takes the cards that are most
// overdue relative to their priority, up to the daily limit. Missed days never
// pile up: the list is always the limit, and whoever has waited longest (for
// their priority) goes first.

import { PRIORITIES, daysBetween, lastPrayed, isPrayable, addDays, tickKeys } from './model.js';

// Relative spacing between prayers for each priority. Only the ratios matter:
// a High card is due twice as often as a Medium card, and so on.
export const INTERVAL = { high: 2, med: 4, low: 8, occ: 16 };

const RANK = { high: 0, med: 1, low: 2, occ: 3 };

// Small stable hash so ties are broken the same way all day, but differently
// on different days.
const hash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const overdueScore = (card, date) => {
  const last = lastPrayed(card);
  const interval = INTERVAL[card.priority] || INTERVAL.med;
  if (!last) return 1000 + 1 / interval; // never prayed for: bring them in soon
  return daysBetween(last, date) / interval;
};

// All prayable cards not yet prayed for today, most overdue first.
export const rankCards = (cards, people, date, exclude = []) => {
  const skip = new Set(exclude);
  return cards
    .filter((c) => !skip.has(c.id) && isPrayable(c, people) && lastPrayed(c) !== date)
    .map((c) => ({ card: c, score: overdueScore(c, date) }))
    .sort((a, b) =>
      b.score - a.score ||
      RANK[a.card.priority] - RANK[b.card.priority] ||
      hash(a.card.id + date) - hash(b.card.id + date))
    .map((x) => x.card);
};

// Every-day cards (High only) are chosen first, then the most overdue fill
// the rest. The day's order is then mixed, so every-day cards aren't always
// the first ones you pray for.
export const buildList = (cards, people, date, limit) => {
  const ranked = rankCards(cards, people, date);
  const daily = ranked.filter(isEveryDay);
  const others = ranked.filter((c) => !isEveryDay(c));
  const chosen = [...daily, ...others].slice(0, limit);
  return chosen.sort((a, b) => hash(a.id + date) - hash(b.id + date)).map((c) => c.id);
};

export const isEveryDay = (card) => card.priority === 'high' && !!card.everyDay;

// How many every-day cards there are, and whether they leave room for anyone else.
export const everyDayCheck = (cards, people, limit) => {
  const count = cards.filter((c) => isEveryDay(c) && isPrayable(c, people)).length;
  return { count, full: count > 0 && count >= limit };
};

export const nextCards = (cards, people, date, list, count) => {
  const ranked = rankCards(cards, people, date, list);
  return [...ranked.filter(isEveryDay), ...ranked.filter((c) => !isEveryDay(c))].slice(0, count).map((c) => c.id);
};

// A card counts as prayed once every tick box on it is ticked.
export const isCardDone = (card, people, ticks) => {
  const keys = tickKeys(card, people);
  const t = ticks[card.id] || {};
  return keys.length > 0 && keys.every((k) => t[k]);
};

export const prayedCount = (session, cards, people) =>
  session.list.filter((id) => {
    const card = cards.find((c) => c.id === id);
    return card && isCardDone(card, people, session.ticks);
  }).length;

export const newSession = (cards, people, date, limit) => ({
  date,
  list: buildList(cards, people, date, limit),
  ticks: {},
  keepGoing: false,
  index: 0,
});

// Change the day's limit part way through.
// - Cards already prayed for are never removed.
// - Cards already in the list keep their order.
// - Raising the limit adds the next most overdue cards to the end.
// - Lowering it removes cards not yet prayed for, from the end.
export const applyLimit = (session, cards, people, limit) => {
  let list = [...session.list];
  const done = (id) => {
    const card = cards.find((c) => c.id === id);
    return card && isCardDone(card, people, session.ticks);
  };
  if (list.length < limit) {
    list = list.concat(nextCards(cards, people, session.date, list, limit - list.length));
  } else {
    for (let i = list.length - 1; i >= 0 && list.length > limit; i--) {
      if (!done(list[i])) list.splice(i, 1);
    }
  }
  const prayed = list.filter(done).length;
  return {
    ...session,
    list,
    // Reaching a new, higher limit shows the finish screen again.
    keepGoing: session.keepGoing && limit < prayed,
    index: Math.min(session.index, Math.max(0, list.length - 1)),
  };
};

// Estimate how often each priority comes up at a given daily limit by
// simulating the next twelve weeks. Returns average days between prayers,
// or null for priorities with no cards.
export const estimateIntervals = (cards, people, limit, startDate) => {
  let sim = cards.filter((c) => isPrayable(c, people)).map((c) => ({ ...c, prayed: [...(c.prayed || [])] }));
  const gaps = { high: [], med: [], low: [], occ: [] };
  const DAYS = 84;
  for (let d = 0; d < DAYS; d++) {
    const date = addDays(startDate, d);
    const chosen = new Set(buildList(sim, people, date, limit));
    sim = sim.map((c) => {
      if (!chosen.has(c.id)) return c;
      const last = lastPrayed(c);
      if (last && d > 14) gaps[c.priority].push(daysBetween(last, date));
      return { ...c, prayed: [...c.prayed, date] };
    });
  }
  const result = {};
  for (const p of PRIORITIES) {
    const count = sim.filter((c) => c.priority === p).length;
    if (!count) { result[p] = null; continue; }
    const g = gaps[p];
    result[p] = g.length ? g.reduce((a, b) => a + b, 0) / g.length : DAYS;
  }
  return result;
};

export const describeInterval = (days) => {
  if (days == null) return 'No cards yet';
  if (days <= 1.3) return 'About every day';
  if (days < 5.5) return `Every ~${Math.round(days)} days`;
  if (days < 10) return 'About weekly';
  if (days < 20) return 'About fortnightly';
  if (days < 45) return 'About monthly';
  return 'Less than monthly';
};
