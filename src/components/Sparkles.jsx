import { useEffect, useRef } from 'react';

// Tiny specks of light rising slowly and twinkling behind the Home screen.
// Pauses while the app is in the background, and stays still for people who
// have turned on Reduce Motion.
const DENSITY = 32 / (280 * 606); // the "middle amount" from the mockup

export default function Sparkles() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = cv.getContext('2d');
    const R = (a, b) => a + Math.random() * (b - a);
    let W = 0, H = 0, parts = [], raf = 0, last = 0;

    const spawn = (anywhere) => ({
      x: R(0, W), y: anywhere ? R(0, H) : H + 4, t: R(0, 1000), ph: R(0, 6.28),
      // Sized for a real phone screen (the mockup was viewed larger).
      r: R(1, 2.6), a: R(0.5, 0.95), vx: R(-2, 2), vy: R(-9, -3),
    });
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = Math.max(window.innerHeight, document.documentElement.clientHeight);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(80, Math.round(W * H * DENSITY));
      while (parts.length < n) parts.push(spawn(true));
      parts.length = n;
    };
    const frame = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.t += dt;
        p.x += p.vx * dt + Math.sin(p.t + p.ph) * 0.08;
        p.y += p.vy * dt;
        const twinkle = 0.55 + 0.45 * Math.sin(p.t * 2.2 + p.ph);
        ctx.fillStyle = `rgba(255,255,255,${p.a * twinkle})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
        if (p.y < -4) parts[i] = spawn(false);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVisible = () => (document.visibilityState === 'visible' ? start() : stop());

    size();
    start();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop(); window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return <canvas ref={ref} className="sparkles" aria-hidden="true" />;
}
