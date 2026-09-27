import { describe, it, expect } from 'vitest';
import { currentSky, skyForTime, skyForDay, skyMode, COLOUR_SKIES } from './skies.js';

const at = (h, m = 0) => new Date(2026, 8, 28, h, m);

describe('home colour', () => {
  it('follows the time of day', () => {
    expect(skyForTime(at(6))).toBe('morning');
    expect(skyForTime(at(12))).toBe('midday');
    expect(skyForTime(at(15))).toBe('afternoon');
    expect(skyForTime(at(17, 45))).toBe('sunset');
    expect(skyForTime(at(19))).toBe('dusk');
    expect(skyForTime(at(23))).toBe('night');
    expect(skyForTime(at(3))).toBe('night');
  });

  it('keeps the same random colour all day, from the ticked ones only', () => {
    const pool = ['ocean', 'aurora'];
    const morning = skyForDay(pool, at(6));
    expect(pool).toContain(morning);
    expect(skyForDay(pool, at(22))).toBe(morning);
  });

  it('falls back to all colours if none are ticked', () => {
    expect(COLOUR_SKIES).toContain(skyForDay([], at(9)));
  });

  it('uses a chosen colour until it is changed', () => {
    expect(currentSky({ sky: 'forest' }, at(6))).toBe('forest');
    expect(currentSky({ sky: 'time' }, at(6))).toBe('morning');
    expect(skyMode('forest')).toBe('choose');
    expect(skyMode('random')).toBe('random');
    expect(skyMode('time')).toBe('time');
  });
});

import { prayerDate } from './model.js';

describe('prayer day', () => {
  it('runs from 3am to 3am', () => {
    expect(prayerDate(new Date(2026, 8, 28, 0, 30))).toBe('2026-09-27');
    expect(prayerDate(new Date(2026, 8, 28, 2, 59))).toBe('2026-09-27');
    expect(prayerDate(new Date(2026, 8, 28, 3, 0))).toBe('2026-09-28');
    expect(prayerDate(new Date(2026, 8, 28, 23, 59))).toBe('2026-09-28');
  });
});
