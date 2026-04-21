import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { StockDetail } from './pages/StockDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Survey } from './pages/Survey';
import { Portfolio } from './pages/Portfolio';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';

export const router = createBrowserRouter([
  // Public
  { path: '/login', Component: Login },
  { path: '/register', Component: Register },

  // Needs auth but not a completed profile
  {
    path: '/survey',
    element: (
      <ProtectedRoute requireProfile={false}>
        <Survey />
      </ProtectedRoute>
    ),
  },

  // Protected app
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Home },
      { path: 'stock/:symbol', Component: StockDetail },
      { path: 'portfolio', Component: Portfolio },
      { path: 'alerts', Component: Alerts },
      { path: 'settings', Component: Settings },
    ],
  },
]);
