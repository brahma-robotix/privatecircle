import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Verifying private session...',
}) => {
  return (
    <div
      className="loading-screen-container"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="loading-card">
        <div className="loading-brand-cluster">
          <div className="loading-logo-ring">
            <span className="loading-logo-icon">⭕</span>
          </div>
          <h2 className="loading-app-title">PrivateCircle</h2>
        </div>
        <div className="loading-spinner-bar">
          <div className="loading-progress-line" />
        </div>
        <p className="loading-status-text">{message}</p>
        <span className="loading-security-badge">
          🔒 End-to-end encrypted session verification
        </span>
      </div>
    </div>
  );
};
