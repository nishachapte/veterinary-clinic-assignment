import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // happy-dom, not jsdom: jsdom installs its own AbortController, and Node's
    // fetch rejects a signal that is not an instance of its own class
    // ("Expected signal to be an instance of AbortSignal"). TanStack Query
    // passes a signal to every queryFn, so under jsdom every component test
    // fails with a transport error that does not exist in a real browser.
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
