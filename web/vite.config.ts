import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/qode/',
  worker: { format: 'es' },
  server: { fs: { allow: ['..'] } },
});
