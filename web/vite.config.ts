import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/',
  worker: { format: 'es' },
  build: { rolldownOptions: { input: { app: 'index.html', docs: 'docs/index.html' } } },
  server: { fs: { allow: ['..'] } },
});
