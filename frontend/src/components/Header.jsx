import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';

const Header = ({ scrollY = 0 }) => {
  const { logout } = useAuth();
  const { getTotalUnreadMessages, pendingFriendRequests } = useNotifications();

  return (
    <header className={`main-header ${scrollY > 50 ? 'header-scrolled' : ''}`}>
      <div className="header-inner">
        <Link to="/" className="brand-logo" aria-label="Helios Home">
          <svg className="logo-icon" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path d="M20 5L25 15H15L20 5Z" fill="url(#logo-grad)" />
            <path d="M20 35L15 25H25L20 35Z" fill="url(#logo-grad)" />
            <circle cx="20" cy="20" r="3" fill="url(#logo-grad)" />
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#646cff" />
                <stop offset="100%" stopColor="#41d1ff" />
              </linearGradient>
            </defs>
          </svg>
          <span className="brand-name">Helios</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link to="/dashboard" className="nav-item">Feed</Link>
          <Link to="/rooms" className="nav-item">Rooms</Link>
          <Link to="/friends" className="nav-item nav-item-with-badge">
            Friends
            {(getTotalUnreadMessages() > 0 || pendingFriendRequests > 0) && (
              <span className="notification-badge" aria-label={`${getTotalUnreadMessages() + pendingFriendRequests} unread notifications`}>
                {getTotalUnreadMessages() + pendingFriendRequests}
              </span>
            )}
          </Link>
          <Link to="/profile" className="nav-item">Profile</Link>
          <Link to="/settings" className="nav-item">Settings</Link>
          <ThemeToggle />
          <NotificationPanel />
          <button onClick={logout} className="nav-item nav-logout" aria-label="Logout">Logout</button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
