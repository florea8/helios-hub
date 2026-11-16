const EmptyState = ({ title, message, action = null }) => (
  <div className="empty">
    <h3>{title}</h3>
    <p>{message}</p>
    {action}
  </div>
);

export default EmptyState;
