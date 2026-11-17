import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The backend sits behind a context path and allows all CORS origins, so direct
// calls would work. We proxy anyway: the app then always talks to a same-origin
// `/api`, which is how it would be deployed, and no CORS behaviour is relied on.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9966',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/petclinic/api'),
      },
    },
  },
});
