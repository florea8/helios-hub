import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import Logo from './Logo';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  const { logout } = useAuth();
  const { getTotalUnreadMessages, pendingFriendRequests } = useNotifications();
  const waiting = getTotalUnreadMessages() + pendingFriendRequests;

  return (
    <header className="topbar">
      <div className="wrap">
        <Logo />
        <nav className="topbar-nav" aria-label="Main">
          <NavLink to="/dashboard">Feed</NavLink>
          <NavLink to="/rooms">Rooms</NavLink>
          <NavLink to="/friends">
            Friends
            {waiting > 0 && <span className="badge" aria-label={`${waiting} unread`}>{waiting}</span>}
          </NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <ThemeToggle />
        <NotificationPanel />
        <button type="button" className="button" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
};

export default Header;
