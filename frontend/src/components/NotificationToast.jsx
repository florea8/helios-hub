import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import '../styles/NotificationToast.css';

const NotificationToast = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="notification-container">
      {notifications.map((notif) => (
        <div 
          key={notif.id} 
          className={`notification-toast notification-${notif.type}`}
          onClick={() => removeNotification(notif.id)}
        >
          <div className="notification-icon">
            {notif.type === 'message' && '💬'}
            {notif.type === 'friend_request' && '👥'}
            {notif.type === 'friend_accepted' && '✅'}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notif.title}</div>
            <div className="notification-message">{notif.message}</div>
          </div>
          <button 
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notif.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
