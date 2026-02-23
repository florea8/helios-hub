import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/UserListItem.css';

const UserListItem = ({ 
  user, 
  subtitle,
  onClick = null,
  actions = null,
  isActive = false
}) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
    return `${API_URL}/${imagePath}`;
  };

  const getInitials = (username) => {
    return username ? username[0].toUpperCase() : 'U';
  };

  return (
    <div 
      className={`friend-item ${isActive ? 'friend-item-active' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Link to={`/profile/${user.id}`} onClick={(e) => e.stopPropagation()}>
        {user.profile_picture ? (
          <img src={getImageUrl(user.profile_picture)} alt={user.username} className="friend-avatar" />
        ) : (
          <div className="friend-avatar">{getInitials(user.username)}</div>
        )}
      </Link>
      <div className="friend-details">
        <Link 
          to={`/profile/${user.id}`}
          className="friend-name"
          onClick={(e) => e.stopPropagation()}
        >
          {user.username}
        </Link>
        {subtitle && (
          <span className="friend-status">{subtitle}</span>
        )}
      </div>
      {actions && (
        <div onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default UserListItem;
