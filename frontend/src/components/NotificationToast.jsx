import { useNotifications } from '../hooks/useNotifications';

const NotificationToast = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="toasts" aria-live="polite">
      {notifications.map((notif) => (
        <div key={notif.id} className="toast" onClick={() => removeNotification(notif.id)}>
          <div>
            <b>{notif.title}</b>
            <p>{notif.message}</p>
          </div>
          <button type="button" aria-label="Dismiss">
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
