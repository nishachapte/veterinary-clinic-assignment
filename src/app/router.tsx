import { Navigate, Route, Routes } from 'react-router-dom';
import { ReceptionDeskPage } from '~/features/reception/ReceptionDeskPage';

/** One screen: everything the receptionist does happens on /desk. */
export const AppRoutes = () => (
  <Routes>
    <Route path="/desk" element={<ReceptionDeskPage />} />
    <Route path="*" element={<Navigate to="/desk" replace />} />
  </Routes>
);
