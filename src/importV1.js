// Convert a Prayer Companion v1 backup file into v2 data.
//
// v1 kept prayer points as one block of text (one point per line) and saved a
// copy of those points with every prayer. We turn each line into its own
// point, and rebuild past points from the saved copies so nothing is lost:
// a line that was prayed for before but isn't there now becomes a past point.

import { newId, splitLines, addDate } from './model.js';

const PRIORITY_FROM_FREQUENCY = {
  daily: 'high',
  'every-2-3-days': 'high',
  weekly: 'med',
  fortnightly: 'low',
  monthly: 'occ',
};

export const isV1Backup = (data) =>
  !!data && Array.isArray(data.people) && Array.isArray(data.cards) && data.app !== 'prayer-companion-2';

const entryDate = (h) => (typeof h === 'string' ? h : h && h.date);

// Build point objects from the current text plus historical snapshots.
// snapshots: [{ date, text }] in any order.
const buildPoints = (currentText, snapshots, fallbackDate) => {
  const current = splitLines(currentText);
  const seen = new Map(); // line -> { first, last }
  for (const { date, text } of [...snapshots].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    for (const line of splitLines(text)) {
      const s = seen.get(line);
      if (s) s.last = date;
      else seen.set(line, { first: date, last: date });
    }
  }
  const points = current.map((text) => ({
    id: newId(),
    text,
    added: seen.get(text)?.first || fallbackDate,
    status: 'active',
    closed: null,
  }));
  for (const [text, { first, last }] of seen) {
    if (current.includes(text)) continue;
    points.push({ id: newId(), text, added: first, status: 'removed', closed: last });
  }
  return points;
};

export const importV1 = (data, todayIso) => {
  const v1People = data.people || [];
  const v1Cards = data.cards || [];

  const people = v1People.map((p) => {
    const history = p.prayerHistory || [];
    const dates = [...new Set(history.map(entryDate).filter(Boolean))].sort();
    const snapshots = history
      .filter((h) => typeof h === 'object' && h && h.date)
      .map((h) => ({ date: h.date, text: h.personPrayerPoint || '' }));
    return {
      id: p.id,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      organisation: p.organisation || '',
      isChild: !!p.isChild,
      ownTick: p.individualCheckbox !== false,
      added: p.dateAdded || dates[0] || todayIso,
      archived: !!p.archived,
      prayed: dates,
      points: buildPoints(p.prayerPoint, snapshots, p.dateAdded || todayIso),
    };
  });

  const byId = new Map(people.map((p) => [p.id, p]));

  const cards = v1Cards
    .filter((c) => !c.dissolved) // split-up groups were already replaced by solo cards in v1
    .map((c) => {
      const members = (c.peopleIds || []).map((id) => byId.get(id)).filter(Boolean);
      // Card dates: every day any member was prayed for while on this card.
      let prayed = [];
      for (const v1p of v1People.filter((p) => (c.peopleIds || []).includes(p.id))) {
        for (const h of v1p.prayerHistory || []) {
          const d = entryDate(h);
          if (!d) continue;
          const onThisCard = typeof h === 'string' || !h.cardId || h.cardId === c.id;
          if (onThisCard) prayed = addDate(prayed, d);
        }
      }
      // Group-wide points history comes from the card text saved with each prayer.
      const snapshots = [];
      for (const v1p of v1People.filter((p) => (c.peopleIds || []).includes(p.id))) {
        for (const h of v1p.prayerHistory || []) {
          if (typeof h === 'object' && h && h.cardId === c.id) snapshots.push({ date: h.date, text: h.cardPrayerPoint || '' });
        }
      }
      let cardPoints = buildPoints(c.prayerPoint, snapshots, c.dateCreated || todayIso);
      const isGroup = !!c.isGroup;
      // Solo cards keep their points on the person.
      if (!isGroup && members[0]) {
        const person = members[0];
        const existing = new Set(person.points.map((pt) => pt.text));
        person.points = person.points.concat(cardPoints.filter((pt) => !existing.has(pt.text)));
        cardPoints = [];
      }
      return {
        id: c.id,
        name: c.name || '',
        personIds: (c.peopleIds || []).filter((id) => byId.has(id)),
        isGroup,
        withChildren: !!c.includeUnnamedChildren,
        priority: PRIORITY_FROM_FREQUENCY[c.frequency] || 'med',
        everyDay: false,
        created: c.dateCreated || todayIso,
        archived: !!c.archived || c.active === false,
        prayed,
        points: cardPoints,
      };
    });

  // Anyone not on any card gets their own card so they aren't lost.
  const onCard = new Set(cards.flatMap((c) => c.personIds));
  for (const p of people) {
    if (onCard.has(p.id)) continue;
    cards.push({
      id: newId(), name: '', personIds: [p.id], isGroup: false, withChildren: false,
      priority: 'med', everyDay: false, created: p.added, archived: p.archived, prayed: [...p.prayed], points: [],
    });
  }

  return { people, cards, userName: typeof data.userName === 'string' ? data.userName : '' };
};
