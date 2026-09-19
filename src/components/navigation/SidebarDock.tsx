import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewType } from '../../types';

interface NavItem {
  id: ViewType;
  label: string;
  icon: string;
  badge?: number;
  adminOnly?: boolean;
}

export const SidebarDock: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    currentUser,
    unreadNotificationsCount,
    setIsNotificationsModalOpen,
  } = useApp();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'chat', label: 'Chats', icon: '💬' },
    { id: 'groups', label: 'Groups', icon: '👥' },
    { id: 'relationship', label: 'Couple', icon: '❤️' },
    { id: 'memories', label: 'Memories', icon: '📸' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'calls', label: 'Calls', icon: '📞' },
    { id: 'location', label: 'Distance', icon: '📍' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'admin', label: 'Admin Settings', icon: '🛡️', adminOnly: true },
  ];

  return (
    <aside className="sidebar-dock" aria-label="Main Navigation">
      {/* Brand Logo */}
      <div className="dock-brand">
        <button
          className="dock-logo-btn"
          onClick={() => setCurrentView('home')}
          title="PrivateCircle Home"
        >
          <span className="dock-logo-icon">⭕</span>
        </button>
      </div>

      {/* Navigation Icons */}
      <nav className="dock-nav-list">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              className={`dock-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
              title={item.label}
              aria-label={item.label}
            >
              <span className="dock-nav-icon">{item.icon}</span>
              <span className="dock-nav-label">
                {item.id === 'admin' ? 'Admin' : item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="dock-badge-dot" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Notifications & Profile */}
      <div className="dock-footer">
        <button
          className="dock-notif-btn"
          onClick={() => setIsNotificationsModalOpen(true)}
          title="Notifications"
          aria-label="Open notifications"
        >
          <span className="dock-footer-icon">🔔</span>
          {unreadNotificationsCount > 0 && (
            <span className="dock-notif-badge">{unreadNotificationsCount}</span>
          )}
        </button>

        <button
          className="dock-user-btn"
          onClick={() => setCurrentView('settings')}
          title={`Signed in as ${currentUser.name}`}
        >
          <div
            className="dock-avatar"
            style={{ backgroundColor: currentUser.avatarBg }}
          >
            {currentUser.name.charAt(0)}
          </div>
          <span className="dock-user-status-dot" />
        </button>
      </div>
    </aside>
  );
};
