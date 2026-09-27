import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Stamp the service worker with a build id so each deploy gets a fresh cache.
const stampServiceWorker = () => ({
  name: 'stamp-service-worker',
  closeBundle() {
    const file = resolve('dist/sw.js');
    const src = readFileSync(file, 'utf8');
    writeFileSync(file, src.replace('__BUILD_ID__', Date.now().toString(36)));
  },
});

export default defineConfig({
  // Relative paths so the app works under any GitHub Pages repo name.
  base: './',
  plugins: [react(), stampServiceWorker()],
  test: { environment: 'node' },
});
