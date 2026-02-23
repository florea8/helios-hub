import React from 'react';
import '../styles/UploadProgress.css';

/**
 * Upload Progress Component
 * Displays upload progress with visual feedback
 */
export default function UploadProgress({ progress, fileName, onCancel }) {
  return (
    <div className="upload-progress">
      <div className="upload-progress-header">
        <div className="upload-progress-info">
          <svg className="upload-progress-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path 
              d="M7 18C7 18 7 17 8 17H16C17 17 17 18 17 18C17 19 16 20 16 20H8C8 20 7 19 7 18Z" 
              fill="currentColor"
            />
            <path 
              d="M12 2L12 14M12 14L16 10M12 14L8 10" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          <div className="upload-progress-text">
            <div className="upload-progress-filename">{fileName}</div>
            <div className="upload-progress-status">
              {progress < 100 ? `Uploading... ${progress}%` : 'Upload complete!'}
            </div>
          </div>
        </div>
        {onCancel && progress < 100 && (
          <button 
            className="upload-progress-cancel"
            onClick={onCancel}
            aria-label="Cancel upload"
          >
            &times;
          </button>
        )}
      </div>

      <div className="upload-progress-bar-container">
        <div 
          className="upload-progress-bar"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>

      {progress === 100 && (
        <div className="upload-progress-success">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M6 10L8.5 12.5L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>File uploaded successfully</span>
        </div>
      )}
    </div>
  );
}
