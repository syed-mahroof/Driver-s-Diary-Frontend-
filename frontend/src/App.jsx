import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import { InstallPrompt } from './components/InstallPrompt';
import './styles/global.css';

const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Inside <Suspense>, so this only fires once the first screen (and its lazy chunk) has really rendered.
function AppReady() {
  useEffect(() => { window.__hidePreloader?.(); }, []);
  return null;
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f8fafc' : '#0f1117');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <InstallPrompt />
        <Suspense fallback={<div className="loading-state" role="status">Loading dashboard…</div>}><AppReady /><Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/driver"
            element={
              <ProtectedRoute>
                <DriverDashboard toggleTheme={toggleTheme} theme={theme} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard toggleTheme={toggleTheme} theme={theme} />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes></Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
