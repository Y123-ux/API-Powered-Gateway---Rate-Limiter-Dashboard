import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from './context/SocketContext';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import TrafficPage from './pages/TrafficPage';
import RateLimitsPage from './pages/RateLimitsPage';
import ApiDocsPage from './pages/ApiDocsPage';
import FlaggedPage from './pages/FlaggedPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/traffic" element={<TrafficPage />} />
              <Route path="/rate-limits" element={<RateLimitsPage />} />
              <Route path="/api-docs" element={<ApiDocsPage />} />
              <Route path="/flagged" element={<FlaggedPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
