import { defineConfig } from 'vite';

// Each world is its own chunk, loaded only when a visitor opens it; three.js is shared.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined) } },
  },
});
