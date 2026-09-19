import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewType } from '../../types';

export const MobileBottomNav: React.FC = () => {
  const { currentView, setCurrentView, currentUser } = useApp();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  const mobileTabs: { id: ViewType; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'chat', label: 'Chats', icon: '💬' },
    { id: 'relationship', label: 'Couple', icon: '❤️' },
    { id: 'memories', label: 'Memories', icon: '📸' },
    ...(isAdmin ? [{ id: 'admin' as ViewType, label: 'Admin', icon: '🛡️' }] : [{ id: 'settings' as ViewType, label: 'Settings', icon: '⚙️' }]),
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {mobileTabs.map((tab) => {
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setCurrentView(tab.id)}
            aria-label={tab.label}
          >
            <span className="mobile-nav-icon">{tab.icon}</span>
            <span className="mobile-nav-text">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
