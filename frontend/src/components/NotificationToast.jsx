import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

const NotificationToast = () => {
  const { notifications, removeNotification } = useNotifications();
  const navigate = useNavigate();

  const open = (notif) => {
    removeNotification(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="toasts" aria-live="polite">
      {notifications.map((notif) => (
        <div key={notif.id} className="toast" onClick={() => open(notif)}>
          <div>
            <b>{notif.title}</b>
            <p>{notif.message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notif.id);
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
