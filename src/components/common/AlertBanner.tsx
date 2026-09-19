import React from 'react';

export const AlertBanner: React.FC = () => {
  return (
    <div className="alert-banner" role="status">
      <div className="alert-banner-content">
        <span className="alert-icon">🔒</span>
        <span className="alert-text">
          <strong>Prototype Mode:</strong> PrivateCircle is running locally with mock data and browser local storage. No cloud database or external sync.
        </span>
      </div>
    </div>
  );
};
