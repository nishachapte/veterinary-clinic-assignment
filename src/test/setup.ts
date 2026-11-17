import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, resetCreated } from './handlers';

// A mocked request still costs ~1s to render through on a cold MSW worker,
// which is exactly Testing Library's default. Raising it keeps the suite from
// failing on timing rather than on behaviour.
configure({ asyncUtilTimeout: 3000 });

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({
    onUnhandledRequest(request, print) {
      // The contract tests deliberately talk to the real backend on 9966.
      if (new URL(request.url).port === '9966') return;
      print.error();
    },
  });
});

afterEach(() => {
  server.resetHandlers();
  resetCreated();
});

afterAll(() => {
  server.close();
});
