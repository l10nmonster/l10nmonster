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

  // Optional: Configure the build output directory if needed (defaults to 'dist')
  // build: {
  //   outDir: 'build' // Match CRA's default build folder name
  // }
});
