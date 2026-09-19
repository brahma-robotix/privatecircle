import React from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from './Badge';

interface HeaderProps {
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfile }) => {
  const {
    currentUser,
    currentView,
    setCurrentView,
    logout,
    authMode,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    unreadNotificationsCount,
    setIsNotificationsModalOpen,
  } = useApp();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-toggle-btn"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        <div className="logo-group">
          <div className="logo-icon">⭕</div>
          <div>
            <h1 className="logo-title">PrivateCircle</h1>
            <span className="logo-subtitle">Private & Intimate Circle</span>
          </div>
        </div>

        {/* Admin Navigation Tabs - Required for test compatibility */}
        {isAdmin && (
          <nav className="header-nav">
            <button
              className={`nav-tab ${currentView === 'chat' ? 'active' : ''}`}
              onClick={() => setCurrentView('chat')}
            >
              💬 Chats
            </button>
            <button
              className={`nav-tab ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
            >
              🛡️ Admin Dashboard
            </button>
          </nav>
        )}
      </div>

      <div className="header-right">
        {/* In-app Notification Bell */}
        <button
          className="header-icon-btn notif-header-btn"
          onClick={() => setIsNotificationsModalOpen(true)}
          title="Notifications"
          aria-label="Open notifications"
        >
          <span>🔔</span>
          {unreadNotificationsCount > 0 && (
            <span className="badge-notification-count">{unreadNotificationsCount}</span>
          )}
        </button>

        {/* Profile Details Trigger */}
        <button
          className="user-profile-trigger"
          onClick={onOpenProfile}
          title="View profile & settings"
        >
          <div
            className="user-avatar"
            style={{ backgroundColor: currentUser.avatarBg }}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div className="user-details">
            <span className="user-name">{currentUser.name}</span>
            <Badge
              label={isAdmin ? 'Admin' : 'Member'}
              variant={isAdmin ? 'primary' : 'neutral'}
            />
          </div>
        </button>

        {/* Switch Account / Logout */}
        <button
          className="btn-logout"
          onClick={logout}
          title={authMode === 'supabase' ? 'Sign out of PrivateCircle' : 'Switch account or logout'}
        >
          {authMode === 'supabase' ? 'Sign Out' : 'Switch Account'}
        </button>
      </div>
    </header>
  );
};
