// client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    root: 'ui',
    plugins: [react()],

    server: {
    proxy: {
        '/api': {
            target: 'http://localhost:9691',
            changeOrigin: true,
            // rewrite: (path) => path.replace(/^\/api/, '') // Optional: if you need to remove /api prefix
        }
    }
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // All node_modules in one vendor bundle
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Bundle utility files with index instead of creating tiny chunks
          if (id.includes('/utils/') || id.includes('/src/components/')) {
            return 'index';
          }
          // Pages remain separate for lazy loading
        }
      }
    }
  }
});
