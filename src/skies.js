// The app's skies. The whole app sits on the current sky.
// Modes (settings.sky): 'time' follows the clock through the six day skies;
// 'random' picks one of the ticked colours for the whole day; or a sky key
// chosen in Settings stays until changed.

import { toISODate } from './model.js';

const AURORA_GLOW =
  'radial-gradient(ellipse 70% 30% at 30% 14%, rgba(60,220,170,.28), transparent 70%), ' +
  'radial-gradient(ellipse 60% 26% at 75% 24%, rgba(150,110,255,.26), transparent 70%)';

export const SKIES = {
  // Time of day
  morning: {
    name: 'Sunrise', times: '5–10am', sun: true, top: '#27336E', ring: '#FFFFFF', go: '#D9608F',
    bg: 'linear-gradient(180deg,#27336E 0%,#4E4A94 18%,#8C62A8 34%,#D57BA6 50%,#F4929A 62%,#FBA77E 76%,#FDBA62 90%,#FFCB72 100%)',
  },
  midday: {
    name: 'Midday', times: '10am–2pm', top: '#1D5BB5', ring: '#FFFFFF', go: '#1D5BB5', glass: 'rgba(15,35,75,.3)',
    bg: 'linear-gradient(180deg,#1D5BB5 0%,#2E74CC 24%,#4F92DA 46%,#7AB0E0 66%,#B9C8C8 82%,#E3B77E 94%,#E9AE69 100%)',
  },
  afternoon: {
    name: 'Afternoon', times: '2–5pm', top: '#2E5AA3', ring: '#FFFFFF', go: '#D9822E',
    bg: 'linear-gradient(180deg,#2E5AA3 0%,#5578BA 22%,#9187B4 44%,#D9966F 66%,#EDA352 84%,#F3B04A 100%)',
  },
  sunset: {
    name: 'Sunset', times: '5–6:30pm', top: '#3A2F7A', ring: '#FFE3B0', go: '#E4637A',
    bg: 'linear-gradient(180deg,#3A2F7A 0%,#6E3F95 20%,#B04E8E 40%,#E4637A 58%,#F5835A 74%,#FBA24A 88%,#FFC15A 100%)',
  },
  dusk: {
    name: 'Dusk', times: '6:30–8pm', top: '#2B3170', ring: '#FFD0C0', go: '#8C62A8',
    bg: 'linear-gradient(180deg,#2B3170 0%,#46478F 26%,#6E5DA6 50%,#A277AE 70%,#D891A6 88%,#EFA9A0 100%)',
  },
  night: {
    name: 'Night', times: '8pm–5am', stars: true, top: '#26306A', ring: '#F2EBD0', go: '#4E5FA8',
    bg: 'linear-gradient(180deg,#26306A 0%,#303D7E 30%,#3E4F92 58%,#56659F 82%,#6E7BAE 100%)',
  },
  // Colours
  twilight: {
    name: 'Twilight', top: '#9D8FFF', ring: '#FFB199', go: '#6C5CE7',
    bg: 'linear-gradient(165deg,#9D8FFF 0%,#5A4BC8 40%,#2A2560 75%,#12142A 100%)',
  },
  ocean: {
    name: 'Ocean', top: '#7FE3D5', ring: '#FFFFFF', go: '#1F6FA8',
    bg: 'linear-gradient(165deg,#7FE3D5 0%,#2BB3B1 32%,#1F6FA8 68%,#14264F 100%)',
  },
  rose: {
    name: 'Dusk rose', top: '#FFB3C7', ring: '#FFD9A8', go: '#C24C7E',
    bg: 'linear-gradient(165deg,#FFB3C7 0%,#E0668F 35%,#8B3A7F 70%,#2E1838 100%)',
  },
  forest: {
    name: 'Forest', top: '#B8EBC8', ring: '#FFF3B0', go: '#1E7A5E',
    bg: 'linear-gradient(165deg,#B8EBC8 0%,#4FB889 32%,#1E7A5E 66%,#0D2E28 100%)',
  },
  golden: {
    name: 'Golden hour', top: '#FFE08A', ring: '#FFFFFF', go: '#D65A3C',
    bg: 'linear-gradient(165deg,#FFE08A 0%,#F5A34B 32%,#D65A3C 66%,#5B1F3D 100%)',
  },
  aurora: {
    name: 'Aurora', stars: true, top: '#0E1B2A', ring: '#7FF0C8', go: '#2FA88A', glass: 'rgba(255,255,255,.08)',
    bg: `${AURORA_GLOW}, linear-gradient(175deg,#0E1B2A 0%,#0F1726 60%,#0A0F1C 100%)`,
  },
};

export const DAY_SKIES = ['morning', 'midday', 'afternoon', 'sunset', 'dusk', 'night'];
export const COLOUR_SKIES = ['twilight', 'ocean', 'rose', 'forest', 'golden', 'aurora'];
export const DEFAULT_GLASS = 'rgba(40,24,50,.28)';

export const skyForTime = (d = new Date()) => {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 14) return 'midday';
  if (h >= 14 && h < 17) return 'afternoon';
  if (h >= 17 && h < 18.5) return 'sunset';
  if (h >= 18.5 && h < 20) return 'dusk';
  return 'night';
};

const NEXT_START = { morning: 'Midday at 10am', midday: 'Afternoon at 2pm', afternoon: 'Sunset at 5pm', sunset: 'Dusk at 6:30pm', dusk: 'Night at 8pm', night: 'Sunrise at 5am' };
export const nextSkyText = (key) => NEXT_START[key] || '';

// The same pick all day, from the colours ticked for Random daily.
export const skyForDay = (pool, d = new Date()) => {
  const choices = (pool || []).filter((k) => COLOUR_SKIES.includes(k));
  const list = choices.length ? choices : COLOUR_SKIES;
  const iso = toISODate(d);
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
};

export const currentSky = (settings, d = new Date()) => {
  if (settings.sky === 'random') return skyForDay(settings.randomPool, d);
  if (SKIES[settings.sky]) return settings.sky;
  return skyForTime(d);
};

export const skyMode = (setting) => (setting === 'random' ? 'random' : SKIES[setting] ? 'choose' : 'time');

export const greetingFor = (d = new Date()) => {
  const h = d.getHours();
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
};
