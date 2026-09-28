// Sample people for demo mode. Prayer dates are made up relative to today so
// the demo always looks lived-in.

import { addDays } from './model.js';

let n = 0;
const id = (prefix) => `${prefix}${++n}`;

const pt = (text, added, status = 'active', closed = null) => ({ id: id('pt'), text, added, status, closed });

const history = (todayIso, every, count, offset = 0) =>
  Array.from({ length: count }, (_, i) => addDays(todayIso, -(offset + i * every))).reverse();

export const makeDemoData = (t) => {
  n = 0;
  const people = [];
  const cards = [];
  const back = (d) => addDays(t, -d);

  const person = (firstName, lastName, extra = {}) => {
    const p = {
      id: id('p'), firstName, lastName, organisation: '', isChild: false, ownTick: true,
      added: back(200), archived: false, prayed: [], points: [], ...extra,
    };
    people.push(p);
    return p;
  };
  const solo = (p, priority, prayed, extra = {}) => {
    p.prayed = prayed;
    cards.push({ id: id('c'), name: '', personIds: [p.id], isGroup: false, withChildren: false, priority, everyDay: false, created: back(200), archived: false, prayed, points: [], ...extra });
  };
  const group = (name, members, priority, prayed, points = [], extra = {}) => {
    members.forEach((m) => { m.prayed = prayed; });
    cards.push({ id: id('c'), name, personIds: members.map((m) => m.id), isGroup: true, withChildren: false, priority, everyDay: false, created: back(200), archived: false, prayed, points, ...extra });
  };

  solo(person('Sarah', 'Mitchell', {
    organisation: 'Christ Central Church',
    points: [
      pt('Wisdom as she starts the new job on Monday', back(10)),
      pt('Peace about the house move', back(20)),
      pt('Healing for her mum’s hip recovery', back(60), 'answered', back(7)),
      pt('A job offer after the redundancy', back(150), 'answered', back(56)),
    ],
  }), 'high', history(t, 2, 40, 3));

  group('The Mitchell family', [
    person('David', 'Mitchell', { points: [pt('Energy for the long shifts', back(30))] }),
    person('Jess', 'Mitchell'),
    person('Emma', 'Mitchell', { isChild: true, ownTick: false }),
    person('Liam', 'Mitchell', { isChild: true, ownTick: false }),
  ], 'high', history(t, 1, 60, 1), [pt('Family unity and health', back(90))], { everyDay: true });

  group('The Torres family', [
    person('Carlos', 'Torres', { points: [pt('Visa to come through before Christmas', back(40))] }),
    person('Ana', 'Torres', { points: [pt('New job at the hospital', back(15))] }),
  ], 'med', history(t, 4, 20, 6), [pt('Settling into their new church', back(25))], { withChildren: true });

  solo(person('', '', { organisation: 'OMF Thailand', points: [pt('Protection and provision', back(100)), pt('Team health', back(40))] }), 'med', history(t, 4, 20, 4));
  group('Tuesday gaming group', [person('Josh', 'Reid'), person('Nathan', 'Cole'), person('Chris', 'Palmer')], 'med', history(t, 4, 15, 2), [pt('Real friendships to grow', back(50))]);
  solo(person('Rachel', 'Nguyen', { points: [pt('Final exams', back(12))] }), 'high', history(t, 2, 30, 1));
  solo(person('James', 'Cooper'), 'high', history(t, 2, 30, 2));
  solo(person('Mark', 'Stevens', { organisation: 'Hope Church', points: [pt('Rest over the holidays', back(8))] }), 'high', history(t, 2, 30, 4));
  solo(person('Ben', 'Harris', { points: [pt('Energy and patience with the new baby', back(9)), pt('His dad’s scans next week', back(4))] }), 'low', history(t, 8, 10, 9));
  solo(person('', '', { organisation: 'Christ Central Church', points: [pt('Wisdom for the building project', back(70))] }), 'low', history(t, 8, 10, 5));
  solo(person('', '', { organisation: 'City Youth Outreach', points: [pt('Volunteers for camp', back(30))] }), 'med', history(t, 4, 20, 3));
  solo(person('Priya', 'Shah'), 'low', history(t, 8, 10, 7));
  solo(person('Tom', 'Wilson'), 'high', history(t, 2, 30, 5));
  solo(person('Lily', 'Chen', { points: [pt('Confidence at school', back(18))] }), 'high', history(t, 2, 30, 3));
  solo(person('Rob', 'Allen', { points: [pt('Recovery after surgery', back(25))] }), 'occ', history(t, 16, 5, 12));
  solo(person('Grace', 'Warren'), 'occ', history(t, 16, 5, 20));

  const req = (text) => ({ id: id('r'), text, added: back(3) });
  const lp = (name, reqs = []) => ({ id: id('lp'), name, requests: reqs.map(req) });
  const lists = [
    {
      id: id('l'), name: 'Growth group', created: back(60), history: [],
      people: [
        lp('Josh', ['Job interview on Thursday']),
        lp('Nathan', ['His mum’s surgery', 'Exams next week']),
        lp('Chris & Amy', ['Wisdom about moving house']),
        lp('Priya', ['Settling into the new church']),
        lp('Tom', ['Back pain', 'Patience with the kids']),
        lp('Lily'),
        lp('Ben', ['New baby due this month']),
      ],
      week: { start: back(1), ticks: {} },
    },
    {
      id: id('l'), name: 'Staff team', created: back(30), history: [],
      people: [lp('Anna', ['Planning the camp']), lp('Mike', ['Rest after a big term']), lp('Deb'), lp('Sam', ['His dad’s health'])],
      week: { start: back(2), ticks: {} },
    },
  ];
  lists[0].week.ticks = { [lists[0].people[0].id]: true, [lists[0].people[1].id]: true, [lists[0].people[2].id]: true };
  return { people, cards, lists };
};
