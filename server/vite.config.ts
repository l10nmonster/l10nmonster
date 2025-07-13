import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
    root: 'ui',
    plugins: [react(), tsconfigPaths()],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:9691',
                changeOrigin: true,
            }
        }
    },
    // @ts-expect-error - Vitest config
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        css: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/setupTests.ts',
                'src/**/*.test.{ts,tsx,js,jsx}',
                'src/**/*.stories.{ts,tsx,js,jsx}',
                'dist/',
                'coverage/',
            ]
        }
    }
}); 