import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3003', rewrite: (p) => p.replace(/^\/api/, '') },
      '/media': 'http://127.0.0.1:3003',
    },
  },
  build: { target: 'es2020', cssCodeSplit: true },
});
