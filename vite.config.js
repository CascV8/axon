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
          // One lazily-loaded chunk per course (topics + exam items); course.json stays in the main bundle.
          const m = id.match(/\/src\/content\/courses\/([^/]+)\/(topics|exam)\//);
          if (m) return `course-${m[1]}`;
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
