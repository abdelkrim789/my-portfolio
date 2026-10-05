import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Each world is its own chunk, loaded only when a visitor opens it; three.js is shared.
// The Lab and the CV are separate pages: no three.js, no worlds, fast on any phone.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        lab: resolve(import.meta.dirname, 'lab/index.html'),
        cv: resolve(import.meta.dirname, 'cv/index.html'),
      },
      output: { manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined) },
    },
  },
});
