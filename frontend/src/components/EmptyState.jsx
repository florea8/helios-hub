import React from 'react';
import '../styles/EmptyState.css';

const EmptyState = ({ 
  icon, 
  title, 
  message, 
  action = null,
  iconGradient = 'blue'
}) => {
  return (
    <div className="empty-state">
      {icon && (
        <div className={`empty-state-icon gradient-${iconGradient}`}>
          {icon}
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
