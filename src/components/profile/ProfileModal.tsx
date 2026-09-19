import React from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { currentUser, resetToMockData } = useApp();

  if (!currentUser) return null;

  const handleReset = () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all messages and prototype modifications back to initial default mock data?'
    );
    if (confirmed) {
      resetToMockData();
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card profile-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3>Your Profile & Circle Settings</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="profile-identity">
            <div
              className="profile-large-avatar"
              style={{ backgroundColor: currentUser.avatarBg }}
            >
              {currentUser.name.charAt(0)}
            </div>
            <div className="profile-info">
              <h4>{currentUser.name}</h4>
              <span className="profile-email">{currentUser.email}</span>
              <div className="profile-badges">
                <Badge
                  label={currentUser.role === 'admin' ? 'Circle Admin' : 'Circle Member'}
                  variant={currentUser.role === 'admin' ? 'primary' : 'neutral'}
                />
                <Badge
                  label={currentUser.status === 'active' ? 'Active Status' : 'Suspended'}
                  variant={currentUser.status === 'active' ? 'success' : 'danger'}
                />
              </div>
            </div>
          </div>

          <div className="profile-details-section">
            <div className="detail-item">
              <span className="detail-label">Bio / Note:</span>
              <span className="detail-value">{currentUser.bio || 'None'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Access Level:</span>
              <span className="detail-value">
                {currentUser.role === 'admin'
                  ? 'Administrator (Full Access + Dashboard)'
                  : 'Member (Chat & Circle Messaging)'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Storage Engine:</span>
              <span className="detail-value">Local Browser Storage (Step 1 Prototype)</span>
            </div>
          </div>

          <div className="prototype-reset-box">
            <h4>Prototype Data Controls</h4>
            <p>
              If you have sent test messages or modified members in the admin panel and want to reset back to clean demo data:
            </p>
            <button className="btn-action btn-danger" onClick={handleReset}>
              🔄 Reset to Default Mock Data
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
