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

// Keep the screen on while the app is open, so it doesn't go dark mid-prayer
// (eyes closed means no taps to keep it awake).
//
// First choice is the phone's proper "keep screen on" request. The phone can
// quietly let go of that at any time, not only when the app is hidden, so we
// ask again the moment it's released and check every few seconds too, rather
// than waiting for the next tap. If the phone won't grant it at all (older
// iPhones running the app from the home screen, for example), fall back to a
// tiny silent looping video, which phones treat as "something is playing,
// don't sleep".
{
  let lock = null;
  let asking = false;
  let video = null;

  const startVideo = () => {
    if (!video) {
      video = document.createElement('video');
      video.src = `${import.meta.env.BASE_URL}keep-awake.mp4`;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      // Kept on screen but invisible: phones pause videos they think are hidden.
      video.style.cssText =
        'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
      document.body.appendChild(video);
    }
    if (video.paused) video.play().catch(() => {});
  };

  const stopVideo = () => {
    if (video && !video.paused) video.pause();
  };

  const keepAwake = async () => {
    if (document.visibilityState !== 'visible' || asking) return;
    if (lock && !lock.released) return;
    if ('wakeLock' in navigator) {
      asking = true;
      try {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => setTimeout(keepAwake, 500));
        stopVideo();
        return;
      } catch {
        // Not allowed right now (for example Low Power Mode); use the video.
      } finally {
        asking = false;
      }
    }
    startVideo();
  };

  keepAwake();
  document.addEventListener('visibilitychange', keepAwake);
  window.addEventListener('pageshow', keepAwake);
  window.addEventListener('focus', keepAwake);
  document.addEventListener('pointerdown', keepAwake, { passive: true });
  setInterval(keepAwake, 10000);
}

// Offline support. Only in the built app, so local development stays fresh.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
