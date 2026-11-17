import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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

// Pages that need an account wait until the saved session has been checked,
// so a reload on a slow connection does not bounce a signed-in person to the login page.
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSkeleton count={3} />;
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <Router>
            <ScrollToTop />
            <NotificationToast />
            <Suspense fallback={<LoadingSkeleton count={3} />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/profile/:userId" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/rooms" element={<RequireAuth><Rooms /></RequireAuth>} />
                <Route path="/friends" element={<RequireAuth><Friends /></RequireAuth>} />
              </Routes>
            </Suspense>
          </Router>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
