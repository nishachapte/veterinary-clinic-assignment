import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { createQueryClient } from './queryClient';

/** Everything the tree needs available above the router. */
export const Providers = ({ children }: { children: ReactNode }) => {
  // Created in state so React 19 StrictMode's double-invoke does not discard
  // the cache on the second render pass.
  const [client] = useState(createQueryClient);

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};
