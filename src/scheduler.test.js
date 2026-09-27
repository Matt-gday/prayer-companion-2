import { describe, it, expect } from 'vitest';
import { buildList, newSession, applyLimit, prayedCount, estimateIntervals, everyDayCheck, isCardDone } from './scheduler.js';
import { addDays } from './model.js';

const TODAY = '2026-09-27';

const person = (id, extra = {}) => ({ id, firstName: id, lastName: '', organisation: '', isChild: false, ownTick: true, added: '2026-01-01', archived: false, prayed: [], points: [], ...extra });
const card = (id, priority, lastDaysAgo, extra = {}) => ({
  id, name: '', personIds: [`p${id}`], isGroup: false, withChildren: false, priority, everyDay: false,
  created: '2026-01-01', archived: false, prayed: lastDaysAgo == null ? [] : [addDays(TODAY, -lastDaysAgo)], points: [], ...extra,
});

const make = (specs) => {
  const cards = specs.map(([id, pr, ago, extra]) => card(id, pr, ago, extra));
  const people = cards.map((c) => person(c.personIds[0]));
  return { cards, people };
};

const tickAll = (session, ids) => ({ ...session, ticks: { ...session.ticks, ...Object.fromEntries(ids.map((id) => [id, { [`p${id}`]: true }])) } });

describe('daily list', () => {
  it('never exceeds the limit, however long since praying', () => {
    const { cards, people } = make(Array.from({ length: 45 }, (_, i) => [String(i), 'high', 30]));
    expect(buildList(cards, people, TODAY, 15)).toHaveLength(15);
  });

  it('picks the most overdue for their priority', () => {
    const { cards, people } = make([
      ['a', 'high', 1], // 1 day / 2 = 0.5
      ['b', 'occ', 40], // 40 / 16 = 2.5
      ['c', 'med', 4], // 4 / 4 = 1
      ['d', 'high', 6], // 3
    ]);
    expect(new Set(buildList(cards, people, TODAY, 2))).toEqual(new Set(['d', 'b']));
  });

  it('skips archived cards and cards already prayed today', () => {
    const { cards, people } = make([['a', 'high', 5, { archived: true }], ['b', 'high', 0], ['c', 'low', 3]]);
    expect(buildList(cards, people, TODAY, 10)).toEqual(['c']);
  });

  it('brings in never-prayed cards first', () => {
    const { cards, people } = make([['a', 'high', 10], ['new', 'occ', null]]);
    expect(buildList(cards, people, TODAY, 1)).toEqual(['new']);
  });
});

describe('every day cards', () => {
  it('are always chosen, even when others are more overdue', () => {
    const { cards, people } = make([
      ['fam', 'high', 1, { everyDay: true }],
      ['x', 'high', 20], ['y', 'high', 20],
    ]);
    expect(buildList(cards, people, TODAY, 2)).toContain('fam');
  });

  it('only count on High cards', () => {
    const { cards, people } = make([['a', 'med', 1, { everyDay: true }], ['b', 'med', 10]]);
    expect(buildList(cards, people, TODAY, 1)).toEqual(['b']);
  });

  it('warn when they fill the whole limit', () => {
    const { cards, people } = make([['a', 'high', 1, { everyDay: true }], ['b', 'high', 1, { everyDay: true }], ['c', 'low', 1]]);
    expect(everyDayCheck(cards, people, 2)).toEqual({ count: 2, full: true });
    expect(everyDayCheck(cards, people, 3)).toEqual({ count: 2, full: false });
  });
});

describe('changing the limit mid-day', () => {
  const setup = () => make(Array.from({ length: 30 }, (_, i) => [String(i), 'med', 10 + i]));

  it('raising it keeps the current order and adds to the end', () => {
    const { cards, people } = setup();
    const s = newSession(cards, people, TODAY, 10);
    const raised = applyLimit(s, cards, people, 15);
    expect(raised.list.slice(0, 10)).toEqual(s.list);
    expect(raised.list).toHaveLength(15);
    expect(new Set(raised.list).size).toBe(15);
  });

  it('lowering it never removes prayed cards', () => {
    const { cards, people } = setup();
    let s = newSession(cards, people, TODAY, 10);
    s = tickAll(s, s.list); // prayed for all 10
    const lowered = applyLimit(s, cards, people, 8);
    expect(lowered.list).toEqual(s.list);
    expect(prayedCount(lowered, cards, people)).toBe(10);
  });

  it('lowering it drops unprayed cards from the end', () => {
    const { cards, people } = setup();
    let s = newSession(cards, people, TODAY, 10);
    s = tickAll(s, s.list.slice(0, 4));
    const lowered = applyLimit(s, cards, people, 8);
    expect(lowered.list).toEqual(s.list.slice(0, 8));
  });

  it('keeps extra time going only while the limit stays below what was prayed', () => {
    const { cards, people } = setup();
    let s = newSession(cards, people, TODAY, 10);
    s = applyLimit(s, cards, people, 16);
    s = { ...tickAll(s, s.list), keepGoing: true }; // limit was 10, prayed 16 in extra time
    expect(applyLimit(s, cards, people, 15).keepGoing).toBe(true); // "15 +1"
    expect(applyLimit(s, cards, people, 16).keepGoing).toBe(false); // finish screen
    expect(applyLimit(s, cards, people, 20).keepGoing).toBe(false); // "16 of 20"
  });
});

describe('tick boxes', () => {
  it('a family card is done only when every box is ticked', () => {
    const people = [person('dad'), person('mum'), person('kid', { ownTick: false, isChild: true })];
    const fam = card('f', 'high', 3, { isGroup: true, personIds: ['dad', 'mum', 'kid'] });
    expect(isCardDone(fam, people, { f: { dad: true, mum: true } })).toBe(false);
    expect(isCardDone(fam, people, { f: { dad: true, mum: true, _group: true } })).toBe(true);
  });
});

describe('frequency estimates', () => {
  it('High comes up more often than Low', () => {
    const { cards, people } = make([
      ...Array.from({ length: 16 }, (_, i) => [`h${i}`, 'high', i % 3]),
      ...Array.from({ length: 12 }, (_, i) => [`m${i}`, 'med', i % 5]),
      ...Array.from({ length: 12 }, (_, i) => [`l${i}`, 'low', i % 8]),
      ...Array.from({ length: 6 }, (_, i) => [`o${i}`, 'occ', i % 15]),
    ]);
    const est = estimateIntervals(cards, people, 15, TODAY);
    expect(est.high).toBeLessThan(est.med);
    expect(est.med).toBeLessThan(est.low);
    expect(est.low).toBeLessThan(est.occ);
  });
});
