import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { createQueryClient } from './queryClient';
import { DeskPage } from './DeskPage';

export const App = () => {
  // Created in state so React 19 StrictMode's double-invoke does not discard
  // the cache on the second render pass.
  const [client] = useState(createQueryClient);

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route path="/desk" element={<DeskPage />} />
          <Route path="*" element={<Navigate to="/desk" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
