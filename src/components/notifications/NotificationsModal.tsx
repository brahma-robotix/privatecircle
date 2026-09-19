import React from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

export const NotificationsModal: React.FC = () => {
  const {
    notifications,
    isNotificationsModalOpen,
    setIsNotificationsModalOpen,
    markNotificationRead,
    markAllNotificationsRead,
    setCurrentView,
  } = useApp();

  if (!isNotificationsModalOpen) return null;

  const handleNotificationClick = (id: string, linkView?: any) => {
    markNotificationRead(id);
    if (linkView) {
      setCurrentView(linkView);
      setIsNotificationsModalOpen(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => setIsNotificationsModalOpen(false)}
    >
      <div
        className="modal-box notifications-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="notif-header-title">
            <h3>Notifications</h3>
            <span className="notif-count-badge">
              {notifications.filter((n) => !n.isRead).length} Unread
            </span>
          </div>
          <div className="notif-header-actions">
            <button
              className="btn-link"
              onClick={markAllNotificationsRead}
            >
              Mark all as read
            </button>
            <button
              className="modal-close-btn"
              onClick={() => setIsNotificationsModalOpen(false)}
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body notif-modal-body">
          {notifications.length === 0 ? (
            <div className="empty-notif-box">
              <span>🔔</span>
              <p>No notifications right now.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${notif.isRead ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notif.id, notif.linkView)}
                >
                  <div className="notif-icon-col">
                    <span className="notif-category-icon">
                      {notif.type === 'relationship'
                        ? '❤️'
                        : notif.type === 'call'
                        ? '📞'
                        : notif.type === 'location'
                        ? '📍'
                        : '💬'}
                    </span>
                  </div>

                  <div className="notif-text-col">
                    <div className="notif-title-row">
                      <span className="notif-title">{notif.title}</span>
                      <span className="notif-time">{notif.timestamp}</span>
                    </div>
                    <p className="notif-message">{notif.message}</p>
                    <div className="notif-badges">
                      <Badge
                        label={notif.type}
                        variant={notif.type === 'relationship' ? 'primary' : 'neutral'}
                        size="sm"
                      />
                      {!notif.isRead && (
                        <span className="unread-dot-badge">New</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
