import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, type RenderResult } from '@testing-library/react';
import { useEffect } from 'react';
import { ReceptionDeskPage } from '~/features/reception/ReceptionDeskPage';

/** Records every location the desk passes through, so a test can assert that
 *  the whole workflow happens without navigating. */
const LocationProbe = ({ onChange }: { onChange: (path: string) => void }) => {
  const location = useLocation();
  useEffect(() => {
    onChange(location.pathname);
  }, [location.pathname, onChange]);
  return null;
};

export interface DeskHarness extends RenderResult {
  paths: readonly string[];
}

export const renderDesk = (initialEntry = '/desk'): DeskHarness => {
  const paths: string[] = [];
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe
          onChange={(p) => {
            paths.push(p);
          }}
        />
        <ReceptionDeskPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...result, paths };
};
