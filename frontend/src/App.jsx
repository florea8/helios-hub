import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationToast from './components/NotificationToast';
import LoadingSkeleton from './components/LoadingSkeleton';

// Eager load critical pages (authentication flow)
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy load all other pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Friends = lazy(() => import('./pages/Friends'));
const Profile = lazy(() => import('./pages/Profile'));

// Each page opens at the top instead of keeping the previous page's scroll.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <Router>
            <ScrollToTop />
            <NotificationToast />
            <Suspense fallback={<LoadingSkeleton type="page" count={1} />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/home" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/friends" element={<Friends />} />
              </Routes>
            </Suspense>
          </Router>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
