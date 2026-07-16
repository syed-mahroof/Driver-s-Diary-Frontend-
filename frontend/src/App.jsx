import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { InstallPrompt } from './components/InstallPrompt';
import SplashScreen from './components/SplashScreen';
import './styles/global.css';

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  // Only ever show the splash once per browser session. Without this, a PWA
  // reload triggered by the app being backgrounded/foregrounded (or a service
  // worker update) remounts <App/> and replays the splash mid-session, which
  // reads as "it shows twice".
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('hg-splash-shown'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <AuthProvider>
      {showSplash && (
        <SplashScreen
          onFinish={() => {
            sessionStorage.setItem('hg-splash-shown', 'true');
            setShowSplash(false);
          }}
        />
      )}
      <BrowserRouter>
        <InstallPrompt />
        <Routes>
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
