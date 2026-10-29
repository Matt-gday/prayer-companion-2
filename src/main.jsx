import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './store.jsx';
import App from './App.jsx';
// The Classic theme's fonts, built into the app so they always load (even
// offline), rather than fetched from Google each time.
import '@fontsource/open-sans/latin-400.css';
import '@fontsource/open-sans/latin-400-italic.css';
import '@fontsource/open-sans/latin-500.css';
import '@fontsource/open-sans/latin-600.css';
import '@fontsource/open-sans/latin-700.css';
import '@fontsource/oranienbaum/latin-400.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);

// If the app opens while a new version is still reaching GitHub's servers,
// the page can arrive before its stylesheet. Check once it has loaded, and if
// the styles are missing, reload once to fetch them fresh.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const styled = getComputedStyle(document.documentElement).getPropertyValue('--ui').trim();
    const last = Number(sessionStorage.getItem('pc2_style_reload') || 0);
    if (!styled && Date.now() - last > 60000) {
      sessionStorage.setItem('pc2_style_reload', String(Date.now()));
      location.reload();
    }
  });
}

// Keep the screen on while the app is open, so it doesn't go dark mid-prayer.
// The phone lets go of this whenever the app is hidden, so ask again each
// time it comes back, and on the first tap in case it needs one.
if ('wakeLock' in navigator) {
  let lock = null;
  const keepAwake = async () => {
    if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
    try {
      lock = await navigator.wakeLock.request('screen');
    } catch {
      // Not allowed right now (for example Low Power Mode); try again later.
    }
  };
  keepAwake();
  document.addEventListener('visibilitychange', keepAwake);
  document.addEventListener('pointerdown', keepAwake, { passive: true });
}

// Offline support. Only in the built app, so local development stays fresh.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
