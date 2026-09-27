import { describe, it, expect } from 'vitest';
import { importV1, isV1Backup } from './importV1.js';

const backup = {
  version: 1,
  userName: 'Matt',
  people: [
    {
      id: 'p1', firstName: 'Hannah', lastName: 'Mitchell', organisation: '', isChild: false, individualCheckbox: true,
      prayerPoint: 'Healing from surgery\nPeace during recovery', dateAdded: '2025-01-01',
      prayerHistory: [
        '2025-01-05',
        { date: '2025-02-01', personPrayerPoint: 'Pre-surgery preparations\nHealing from surgery', cardPrayerPoint: 'Family unity', cardId: 'c1' },
        { date: '2025-03-01', personPrayerPoint: 'Healing from surgery\nPeace during recovery', cardPrayerPoint: 'Family unity\nKids schooling', cardId: 'c1' },
      ],
    },
    { id: 'p2', firstName: 'Emma', lastName: 'Mitchell', organisation: '', isChild: true, individualCheckbox: false, prayerPoint: '', prayerHistory: [] },
    { id: 'p3', firstName: '', lastName: '', organisation: 'OMF Thailand', isChild: false, individualCheckbox: true, prayerPoint: 'Team health', prayerHistory: [{ date: '2025-03-02', personPrayerPoint: 'Team health', cardPrayerPoint: 'Visas', cardId: 'c2' }] },
  ],
  cards: [
    { id: 'c1', name: 'Mitchells', peopleIds: ['p1', 'p2'], frequency: 'daily', prayerPoint: 'Kids schooling', includeUnnamedChildren: false, isGroup: true, active: true, dateCreated: '2025-01-01' },
    { id: 'c2', name: 'OMF Thailand', peopleIds: ['p3'], frequency: 'monthly', prayerPoint: 'Visas', includeUnnamedChildren: false, isGroup: false, active: true, dateCreated: '2025-01-01' },
    { id: 'old', name: 'Old group', peopleIds: ['p1'], frequency: 'weekly', prayerPoint: '', isGroup: true, active: true, archived: true, dissolved: true },
  ],
};

describe('v1 import', () => {
  const out = importV1(backup, '2026-09-27');

  it('recognises v1 backups', () => {
    expect(isV1Backup(backup)).toBe(true);
    expect(isV1Backup({ app: 'prayer-companion-2', people: [], cards: [] })).toBe(false);
  });

  it('maps frequencies to priorities', () => {
    expect(out.cards.find((c) => c.id === 'c1').priority).toBe('high');
    expect(out.cards.find((c) => c.id === 'c2').priority).toBe('occ');
    const pr = (frequency) => importV1({ people: [], cards: [{ id: 'x', peopleIds: [], frequency }] }, '2026-09-27').cards[0].priority;
    expect(['daily', 'every-2-3-days', 'weekly', 'fortnightly', 'monthly'].map(pr)).toEqual(['high', 'med', 'low', 'occ', 'occ']);
  });

  it('drops split-up groups', () => {
    expect(out.cards.find((c) => c.id === 'old')).toBeUndefined();
  });

  it('keeps every prayer date, including old-style entries', () => {
    const hannah = out.people.find((p) => p.id === 'p1');
    expect(hannah.prayed).toEqual(['2025-01-05', '2025-02-01', '2025-03-01']);
    expect(out.cards.find((c) => c.id === 'c1').prayed).toEqual(['2025-01-05', '2025-02-01', '2025-03-01']);
  });

  it('turns each line into a point and keeps past points', () => {
    const hannah = out.people.find((p) => p.id === 'p1');
    const active = hannah.points.filter((p) => p.status === 'active').map((p) => p.text);
    const past = hannah.points.filter((p) => p.status === 'removed');
    expect(active).toEqual(['Healing from surgery', 'Peace during recovery']);
    expect(past.map((p) => p.text)).toEqual(['Pre-surgery preparations']);
    expect(past[0].closed).toBe('2025-02-01');
    expect(hannah.points.find((p) => p.text === 'Healing from surgery').added).toBe('2025-02-01');
  });

  it('keeps group points on the group and past group points too', () => {
    const fam = out.cards.find((c) => c.id === 'c1');
    expect(fam.points.filter((p) => p.status === 'active').map((p) => p.text)).toEqual(['Kids schooling']);
    expect(fam.points.filter((p) => p.status === 'removed').map((p) => p.text)).toEqual(['Family unity']);
  });

  it('moves solo card points onto the person', () => {
    const omf = out.people.find((p) => p.id === 'p3');
    expect(omf.points.map((p) => p.text).sort()).toEqual(['Team health', 'Visas']);
    expect(out.cards.find((c) => c.id === 'c2').points).toEqual([]);
  });

  it('keeps shared tick boxes for children', () => {
    expect(out.people.find((p) => p.id === 'p2').ownTick).toBe(false);
    expect(out.userName).toBe('Matt');
  });
});
