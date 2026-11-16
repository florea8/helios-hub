import { Link } from 'react-router-dom';
import Avatar from './Avatar';

const UserListItem = ({ user, subtitle, onClick = null, actions = null, isActive = false, isOnline = false }) => (
  <div className="person" data-active={isActive || undefined} data-clickable={Boolean(onClick) || undefined} onClick={onClick}>
    <Link to={`/profile/${user.id}`} onClick={(e) => e.stopPropagation()} data-online={isOnline || undefined}>
      <Avatar user={user} />
    </Link>
    <div>
      <Link to={`/profile/${user.id}`} onClick={(e) => e.stopPropagation()}>
        {user.username}
      </Link>
      {subtitle && <span className="label">{subtitle}</span>}
    </div>
    {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
  </div>
);

export default UserListItem;
