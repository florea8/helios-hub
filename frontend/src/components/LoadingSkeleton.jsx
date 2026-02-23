import React from 'react';
import '../styles/LoadingSkeleton.css';

const LoadingSkeleton = ({ type = 'card', count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="skeleton-card">
            <div className="skeleton-header">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-text-group">
                <div className="skeleton-text skeleton-title"></div>
                <div className="skeleton-text skeleton-subtitle"></div>
              </div>
            </div>
            <div className="skeleton-content">
              <div className="skeleton-text skeleton-line"></div>
              <div className="skeleton-text skeleton-line"></div>
              <div className="skeleton-text skeleton-line short"></div>
            </div>
            <div className="skeleton-footer">
              <div className="skeleton-button"></div>
              <div className="skeleton-button"></div>
            </div>
          </div>
        );

      case 'post':
        return (
          <div className="skeleton-post">
            <div className="skeleton-post-header">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-text-group">
                <div className="skeleton-text skeleton-name"></div>
                <div className="skeleton-text skeleton-date"></div>
              </div>
            </div>
            <div className="skeleton-post-content">
              <div className="skeleton-text skeleton-line"></div>
              <div className="skeleton-text skeleton-line"></div>
              <div className="skeleton-text skeleton-line"></div>
              <div className="skeleton-image"></div>
            </div>
            <div className="skeleton-post-actions">
              <div className="skeleton-action-btn"></div>
              <div className="skeleton-action-btn"></div>
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="skeleton-message">
            <div className="skeleton-avatar small"></div>
            <div className="skeleton-message-content">
              <div className="skeleton-text skeleton-line short"></div>
              <div className="skeleton-text skeleton-line"></div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="skeleton-list-item">
            <div className="skeleton-avatar small"></div>
            <div className="skeleton-text-group">
              <div className="skeleton-text skeleton-name"></div>
              <div className="skeleton-text skeleton-subtitle"></div>
            </div>
          </div>
        );

      default:
        return (
          <div className="skeleton-card">
            <div className="skeleton-text skeleton-line"></div>
            <div className="skeleton-text skeleton-line"></div>
          </div>
        );
    }
  };

  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
