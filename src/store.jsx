// App state: people and cards, settings, today's prayer session.
// Everything is saved to this device's browser storage. Keys start with
// "pc2_" so they never clash with the v1 app on the same web address.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  newId, newPoint, today, addDate, removeDate, cardMembers, tickKeys, everPrayed,
} from './model.js';
import { newSession, applyLimit, isCardDone, nextCards, prayedCount } from './scheduler.js';
import { importV1, isV1Backup } from './importV1.js';
import { makeDemoData } from './demo.js';

const KEYS = {
  data: 'pc2_data',
  demoData: 'pc2_demo_data',
  settings: 'pc2_settings',
  session: 'pc2_session',
  demoSession: 'pc2_demo_session',
};

const DEFAULT_SETTINGS = {
  name: '',
  sky: 'time', // 'time' | 'random' | a sky key (see skies.js)
  randomPool: ['twilight', 'ocean', 'rose', 'forest', 'golden', 'aurora'],
  font: 'sans', // 'serif' | 'sans'
  size: 'l', // 's' | 'm' | 'l' | 'xl'
  limit: 15,
  onboarded: false,
  lastBackup: null,
  demo: false,
  sparkles: true,
};

const EMPTY = { people: [], cards: [], lists: [] };

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: nothing more we can do here.
  }
};

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

// Where a prayer point lives: on a person, or on a group card.
// target = { kind: 'person' | 'card', id }

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load(KEYS.settings, {}) }));
  const demo = settings.demo;
  const dataKey = demo ? KEYS.demoData : KEYS.data;
  const sessionKey = demo ? KEYS.demoSession : KEYS.session;

  const [data, replaceData] = useState(() => load(dataKey, demo ? makeDemoData(today()) : EMPTY));
  // Updates merge into the data, so changing people and cards never drops
  // prayer lists (and the other way round).
  const setData = useCallback((fn) => replaceData((d) => ({ ...d, ...(typeof fn === 'function' ? fn(d) : fn) })), []);
  const [session, setSession] = useState(() => load(sessionKey, null));

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Data, session and the demo flag always change together, so each render
  // saves to the right place.
  useEffect(() => { save(dataKey, data); }, [data, dataKey]);
  useEffect(() => { save(sessionKey, session); }, [session, sessionKey]);
  useEffect(() => { save(KEYS.settings, settings); }, [settings]);

  const { people, cards } = data;
  const lists = data.lists || [];

  const showToast = useCallback((message, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ message, undo, id: newId() });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const setSetting = useCallback((key, value) => setSettings((s) => ({ ...s, [key]: value })), []);

  // Demo mode uses its own sample data; your real data is left untouched.
  const setDemo = useCallback((on) => {
    replaceData(load(on ? KEYS.demoData : KEYS.data, on ? makeDemoData(today()) : EMPTY));
    setSession(load(on ? KEYS.demoSession : KEYS.session, null));
    setSettings((s) => ({ ...s, demo: on }));
  }, []);

  // ---------- people and cards ----------

  const updatePerson = useCallback((id, patch) =>
    setData((d) => ({ ...d, people: d.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) })), []);

  const updateCard = useCallback((id, patch) =>
    setData((d) => ({
      ...d,
      cards: d.cards.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch };
        if (next.priority !== 'high') next.everyDay = false;
        return next;
      }),
    })), []);

  const editPoints = (d, target, fn) => {
    const list = target.kind === 'person' ? 'people' : 'cards';
    return { ...d, [list]: d[list].map((x) => (x.id === target.id ? { ...x, points: fn(x.points || []) } : x)) };
  };

  const addPoint = useCallback((target, text) => {
    if (!text.trim()) return;
    setData((d) => editPoints(d, target, (pts) => [...pts, newPoint(text)]));
  }, []);

  const setPointText = useCallback((target, pointId, text) =>
    setData((d) => editPoints(d, target, (pts) => pts.map((pt) => (pt.id === pointId ? { ...pt, text } : pt)))), []);

  const setPointStatus = useCallback((target, pointId, status) =>
    setData((d) => editPoints(d, target, (pts) => pts.map((pt) =>
      pt.id === pointId ? { ...pt, status, closed: status === 'active' ? null : today() } : pt))), []);

  const movePoint = useCallback((target, pointId, toIndex) =>
    setData((d) => editPoints(d, target, (pts) => {
      const active = pts.filter((pt) => pt.status === 'active');
      const rest = pts.filter((pt) => pt.status !== 'active');
      const from = active.findIndex((pt) => pt.id === pointId);
      if (from < 0) return pts;
      const [moved] = active.splice(from, 1);
      active.splice(Math.max(0, Math.min(toIndex, active.length)), 0, moved);
      return [...active, ...rest];
    })), []);

  // Days the point's owner was prayed for: their own card(s), or the group card.
  const prayedDatesFor = (d, target) => (target.kind === 'card'
    ? d.cards.find((c) => c.id === target.id)?.prayed || []
    : [...(d.people.find((p) => p.id === target.id)?.prayed || []),
      ...d.cards.filter((c) => c.personIds.includes(target.id)).flatMap((c) => c.prayed || [])]);

  // Deleting keeps a point in the history only if it was ever prayed for;
  // otherwise it's gone completely. Undo puts it back either way.
  const removePoint = useCallback((target, point) => {
    let index = -1;
    setData((d) => {
      const keep = everPrayed({ ...point, closed: today() }, prayedDatesFor(d, target));
      return editPoints(d, target, (pts) => {
        index = pts.findIndex((pt) => pt.id === point.id);
        return keep
          ? pts.map((pt) => (pt.id === point.id ? { ...pt, status: 'removed', closed: today() } : pt))
          : pts.filter((pt) => pt.id !== point.id);
      });
    });
    showToast('Prayer point deleted', () => setData((d) => editPoints(d, target, (pts) => {
      if (pts.some((pt) => pt.id === point.id)) return pts.map((pt) => (pt.id === point.id ? { ...pt, status: 'active', closed: null } : pt));
      const next = [...pts];
      next.splice(index < 0 ? next.length : index, 0, { ...point, status: 'active', closed: null });
      return next;
    })));
  }, [showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const answerPoint = useCallback((target, point) => {
    setPointStatus(target, point.id, 'answered');
    showToast('Marked as answered', () => setPointStatus(target, point.id, 'active'));
  }, [setPointStatus, showToast]);

  const makePerson = (fields) => ({
    id: newId(),
    firstName: (fields.firstName || '').trim(),
    lastName: (fields.lastName || '').trim(),
    organisation: (fields.organisation || '').trim(),
    isChild: !!fields.isChild,
    ownTick: fields.ownTick !== undefined ? fields.ownTick : !fields.isChild,
    added: today(),
    archived: false,
    prayed: [],
    points: (fields.points || []).filter((t) => t.trim()).map((t) => newPoint(t)),
  });

  const makeCard = (fields) => ({
    id: newId(),
    name: (fields.name || '').trim(),
    personIds: fields.personIds || [],
    isGroup: !!fields.isGroup,
    withChildren: !!fields.withChildren,
    priority: fields.priority || 'med',
    everyDay: fields.priority === 'high' && !!fields.everyDay,
    created: today(),
    archived: false,
    prayed: fields.prayed || [],
    points: (fields.points || []).filter((t) => t.trim()).map((t) => newPoint(t)),
  });

  const addSolo = useCallback((fields) => {
    const person = makePerson(fields);
    const card = makeCard({ priority: fields.priority, everyDay: fields.everyDay, personIds: [person.id] });
    setData((d) => ({ people: [...d.people, person], cards: [...d.cards, card] }));
    return card.id;
  }, []);

  // Take people off their current cards (solo cards go, groups lose them).
  const detach = (d, personIds) => ({
    ...d,
    cards: d.cards
      .filter((c) => c.isGroup || !c.personIds.some((id) => personIds.includes(id)))
      .map((c) => (c.isGroup ? { ...c, personIds: c.personIds.filter((id) => !personIds.includes(id)) } : c)),
  });

  const addGroup = useCallback((fields) => {
    const newPeople = (fields.newMembers || []).filter((m) => m.firstName.trim()).map(makePerson);
    const ids = [...(fields.existingIds || []), ...newPeople.map((p) => p.id)];
    const card = makeCard({ ...fields, isGroup: true, personIds: ids });
    setData((d) => {
      const detached = detach(d, fields.existingIds || []);
      return { people: [...detached.people, ...newPeople], cards: [...detached.cards, card] };
    });
    return card.id;
  }, []);

  const addToGroup = useCallback((cardId, { existingIds = [], newMembers = [] }) => {
    const newPeople = newMembers.filter((m) => m.firstName.trim()).map(makePerson);
    setData((d) => {
      const detached = detach(d, existingIds);
      return {
        people: [...detached.people, ...newPeople],
        cards: detached.cards.map((c) =>
          c.id === cardId ? { ...c, personIds: [...c.personIds, ...existingIds, ...newPeople.map((p) => p.id)] } : c),
      };
    });
  }, []);

  // Turn a solo card into a group with new or existing people.
  const makeGroupFrom = useCallback((cardId, name, members) => {
    setData((d) => ({ ...d, cards: d.cards.map((c) => (c.id === cardId ? { ...c, isGroup: true, name } : c)) }));
    addToGroup(cardId, members);
  }, [addToGroup]);

  const soloFor = (person, priority) =>
    makeCard({ priority, personIds: [person.id], prayed: [...(person.prayed || [])] });

  const removeFromGroup = useCallback((cardId, personId) =>
    setData((d) => {
      const card = d.cards.find((c) => c.id === cardId);
      const person = d.people.find((p) => p.id === personId);
      if (!card || !person) return d;
      return {
        ...d,
        cards: [
          ...d.cards.map((c) => (c.id === cardId ? { ...c, personIds: c.personIds.filter((id) => id !== personId) } : c)),
          soloFor(person, card.priority),
        ],
      };
    }), []);

  const splitGroup = useCallback((cardId) =>
    setData((d) => {
      const card = d.cards.find((c) => c.id === cardId);
      if (!card) return d;
      const members = cardMembers(card, d.people);
      return {
        ...d,
        // Keep the old group, hidden, so its history and points aren't lost.
        cards: [
          ...d.cards.map((c) => (c.id === cardId ? { ...c, archived: true, dissolved: true } : c)),
          ...members.map((p) => soloFor(p, card.priority)),
        ],
      };
    }), []);

  const setArchived = useCallback((cardId, archived) =>
    setData((d) => {
      const card = d.cards.find((c) => c.id === cardId);
      if (!card) return d;
      return {
        people: card.isGroup ? d.people : d.people.map((p) => (card.personIds.includes(p.id) ? { ...p, archived } : p)),
        cards: d.cards.map((c) => (c.id === cardId ? { ...c, archived } : c)),
      };
    }), []);

  const deleteCard = useCallback((cardId) =>
    setData((d) => {
      const card = d.cards.find((c) => c.id === cardId);
      if (!card) return d;
      return {
        people: d.people.filter((p) => !card.personIds.includes(p.id)),
        cards: d.cards.filter((c) => c.id !== cardId),
      };
    }), []);

  const deletePerson = useCallback((personId) =>
    setData((d) => ({
      people: d.people.filter((p) => p.id !== personId),
      cards: d.cards
        .map((c) => ({ ...c, personIds: c.personIds.filter((id) => id !== personId) }))
        .filter((c) => c.isGroup || c.personIds.length > 0),
    })), []);

  // ---------- praying ----------

  const date = today();
  const activeSession = session && session.date === date ? session : null;

  const startToday = useCallback(() => {
    const s = activeSession || newSession(cards, people, date, settings.limit);
    setSession(s);
    return s;
  }, [activeSession, cards, people, date, settings.limit]);

  const setLimit = useCallback((limit) => {
    setSetting('limit', limit);
    setSession((s) => (s && s.date === today() ? applyLimit(s, cards, people, limit) : s));
  }, [cards, people, setSetting]);

  const setIndex = useCallback((index) => setSession((s) => (s ? { ...s, index } : s)), []);
  const setView = useCallback((view) => setSession((s) => (s ? { ...s, view } : s)), []);

  // Record or un-record today's prayer for the people behind a tick box,
  // and for the card once all its boxes are ticked.
  const applyTicks = useCallback((cardId, keys, value) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || !activeSession) return;
    const ticks = { ...activeSession.ticks, [cardId]: { ...(activeSession.ticks[cardId] || {}) } };
    for (const k of keys) ticks[cardId][k] = value;
    const members = cardMembers(card, people);
    const affected = new Set();
    for (const k of keys) {
      if (k === '_group') members.filter((p) => !p.ownTick).forEach((p) => affected.add(p.id));
      else affected.add(k);
    }
    const done = isCardDone(card, people, ticks);
    setData((d) => ({
      people: d.people.map((p) => (affected.has(p.id)
        ? { ...p, prayed: value ? addDate(p.prayed || [], date) : removeDate(p.prayed || [], date) }
        : p)),
      cards: d.cards.map((c) => (c.id === cardId
        ? { ...c, prayed: done ? addDate(c.prayed || [], date) : removeDate(c.prayed || [], date) }
        : c)),
    }));
    setSession({ ...activeSession, ticks });
  }, [cards, people, activeSession, date]);

  const toggleTick = useCallback((cardId, key) => {
    const current = !!activeSession?.ticks[cardId]?.[key];
    applyTicks(cardId, [key], !current);
  }, [activeSession, applyTicks]);

  const setCardPrayed = useCallback((cardId, value) => {
    const card = cards.find((c) => c.id === cardId);
    if (card) applyTicks(cardId, tickKeys(card, people), value);
  }, [cards, people, applyTicks]);

  // Extra time: add one more card to the end. Returns false when there's
  // nobody left to pray for today.
  const addExtraCard = useCallback(() => {
    if (!activeSession) return false;
    const [next] = nextCards(cards, people, date, activeSession.list, 1);
    if (!next) return false;
    setSession({ ...activeSession, keepGoing: true, view: 'cards', list: [...activeSession.list, next], index: activeSession.list.length });
    return true;
  }, [activeSession, cards, people, date]);

  const keepPraying = useCallback(() => {
    if (!activeSession) return false;
    const pending = activeSession.list.findIndex((id) => {
      const c = cards.find((x) => x.id === id);
      return c && !isCardDone(c, people, activeSession.ticks);
    });
    if (pending >= 0) {
      setSession({ ...activeSession, keepGoing: true, view: 'cards', index: pending });
      return true;
    }
    return addExtraCard();
  }, [activeSession, cards, people, addExtraCard]);

  // ---------- prayer lists ----------
  // Lists are separate from daily cards: their own people, requests and a
  // weekly set of ticks. Past weeks are kept in history.

  const editList = (listId, fn) =>
    setData((d) => ({ lists: (d.lists || []).map((l) => (l.id === listId ? fn(l) : l)) }));
  const editListPerson = (listId, personId, fn) =>
    editList(listId, (l) => ({ ...l, people: l.people.map((p) => (p.id === personId ? fn(p) : p)) }));
  const listPerson = (name) => ({ id: newId(), name: name.trim(), requests: [] });

  const addList = useCallback((name, names = []) => {
    const list = {
      id: newId(), name: name.trim(), created: today(),
      people: names.filter((n) => n.trim()).map(listPerson),
      week: { start: today(), ticks: {} }, history: [],
    };
    setData((d) => ({ lists: [...(d.lists || []), list] }));
    return list.id;
  }, [setData]);

  const renameList = useCallback((listId, name) => editList(listId, (l) => ({ ...l, name })), [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const deleteList = useCallback((listId) => setData((d) => ({ lists: (d.lists || []).filter((l) => l.id !== listId) })), [setData]);
  const addListPerson = useCallback((listId, name) => {
    if (!name.trim()) return;
    editList(listId, (l) => ({ ...l, people: [...l.people, listPerson(name)] }));
  }, [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const renameListPerson = useCallback((listId, personId, name) => editListPerson(listId, personId, (p) => ({ ...p, name })), [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const removeListPerson = useCallback((listId, personId) =>
    editList(listId, (l) => ({ ...l, people: l.people.filter((p) => p.id !== personId) })), [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const moveListPerson = useCallback((listId, personId, toIndex) => editList(listId, (l) => {
    const people = [...l.people];
    const from = people.findIndex((p) => p.id === personId);
    if (from < 0) return l;
    const [moved] = people.splice(from, 1);
    people.splice(Math.max(0, Math.min(toIndex, people.length)), 0, moved);
    return { ...l, people };
  }), [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const addRequest = useCallback((listId, personId, text) => {
    if (!text.trim()) return;
    editListPerson(listId, personId, (p) => ({ ...p, requests: [...p.requests, { id: newId(), text: text.trim(), added: today() }] }));
  }, [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const editRequest = useCallback((listId, personId, reqId, text) =>
    editListPerson(listId, personId, (p) => ({ ...p, requests: p.requests.map((r) => (r.id === reqId ? { ...r, text } : r)) })), [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const removeRequest = useCallback((listId, personId, reqId) =>
    editListPerson(listId, personId, (p) => ({ ...p, requests: p.requests.filter((r) => r.id !== reqId) })), [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleListTick = useCallback((listId, personId) => editList(listId, (l) => ({
    ...l, week: { ...l.week, ticks: { ...l.week.ticks, [personId]: !l.week.ticks[personId] } },
  })), [setData]); // eslint-disable-line react-hooks/exhaustive-deps
  const newWeek = useCallback((listId, keepRequests) => editList(listId, (l) => ({
    ...l,
    history: [...(l.history || []), {
      start: l.week.start, end: today(), ticks: l.week.ticks,
      people: l.people.map((p) => ({ name: p.name, requests: p.requests.map((r) => r.text) })),
    }],
    week: { start: today(), ticks: {} },
    people: keepRequests ? l.people : l.people.map((p) => ({ ...p, requests: [] })),
  })), [setData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- backup ----------

  const exportBackup = useCallback(() => {
    const backup = {
      app: 'prayer-companion-2',
      version: 2,
      exportDate: new Date().toISOString(),
      userName: settings.name,
      people: load(KEYS.data, EMPTY).people,
      cards: load(KEYS.data, EMPTY).cards,
      lists: load(KEYS.data, EMPTY).lists || [],
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prayer-companion-2-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSetting('lastBackup', today());
  }, [settings.name, setSetting]);

  // Returns a summary for the confirm step, or throws if the file isn't a backup.
  const readBackup = useCallback((text) => {
    const parsed = JSON.parse(text);
    if (parsed && parsed.app === 'prayer-companion-2') {
      return { kind: 'v2', people: parsed.people || [], cards: parsed.cards || [], lists: parsed.lists || [], userName: parsed.userName || '' };
    }
    if (isV1Backup(parsed)) return { kind: 'v1', ...importV1(parsed, today()) };
    throw new Error('not a backup');
  }, []);

  const restoreBackup = useCallback((restored) => {
    save(KEYS.data, { people: restored.people, cards: restored.cards, lists: restored.lists || [] });
    save(KEYS.session, null);
    setSettings((s) => ({ ...s, demo: false, name: s.name || restored.userName || '' }));
    replaceData({ people: restored.people, cards: restored.cards, lists: restored.lists || [] });
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    people, cards, lists, settings, session: activeSession, toast, date,
    addList, renameList, deleteList, addListPerson, renameListPerson, removeListPerson, moveListPerson,
    addRequest, editRequest, removeRequest, toggleListTick, newWeek,
    setSetting, setDemo, setLimit, showToast, dismissToast: () => setToast(null),
    updatePerson, updateCard, addPoint, setPointText, setPointStatus, movePoint, removePoint, answerPoint,
    addSolo, addGroup, addToGroup, makeGroupFrom, removeFromGroup, splitGroup, setArchived, deleteCard, deletePerson,
    startToday, setIndex, setView, toggleTick, setCardPrayed, keepPraying, addExtraCard,
    prayedToday: activeSession ? prayedCount(activeSession, cards, people) : 0,
    exportBackup, readBackup, restoreBackup,
  }), [people, cards, lists, settings, activeSession,
    addList, renameList, deleteList, addListPerson, renameListPerson, removeListPerson, moveListPerson,
    addRequest, editRequest, removeRequest, toggleListTick, newWeek, toast, date, setSetting, setDemo, setLimit, showToast,
    updatePerson, updateCard, addPoint, setPointText, setPointStatus, movePoint, removePoint, answerPoint,
    addSolo, addGroup, addToGroup, makeGroupFrom, removeFromGroup, splitGroup, setArchived, deleteCard, deletePerson,
    startToday, setIndex, setView, toggleTick, setCardPrayed, keepPraying, addExtraCard, exportBackup, readBackup, restoreBackup]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

