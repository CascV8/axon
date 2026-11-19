import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep the question bank separate so app-code updates don't re-download all content.
        manualChunks(id) {
          if (id.includes('/src/content/topics/') || id.includes('/src/content/exam/')) return 'content';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
