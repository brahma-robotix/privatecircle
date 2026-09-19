import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AlertBanner } from './components/common/AlertBanner';
import { Header } from './components/common/Header';
import { LoginScreen } from './components/auth/LoginScreen';
import { SidebarDock } from './components/navigation/SidebarDock';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { Sidebar } from './components/chat/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { HomeView } from './components/views/HomeView';
import { GroupsView } from './components/views/GroupsView';
import { RelationshipView } from './components/views/RelationshipView';
import { MemoriesView } from './components/views/MemoriesView';
import { CalendarView } from './components/views/CalendarView';
import { CallsView } from './components/views/CallsView';
import { LocationView } from './components/views/LocationView';
import { SettingsView } from './components/views/SettingsView';
import { PrivacyCenterView } from './components/views/PrivacyCenterView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProfileModal } from './components/profile/ProfileModal';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { CallModal } from './components/calling/CallModal';
import { LoadingScreen } from './components/common/LoadingScreen';
import './App.css';

const MainAppContent: React.FC = () => {
  const { currentUser, currentView, activeCall, isAuthChecking } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (isAuthChecking) {
    return <LoadingScreen message="Verifying private circle session..." />;
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  const isAdmin = currentUser.role === 'admin';

  // Render content area based on currentView
  const renderMainView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'groups':
        return <GroupsView />;
      case 'relationship':
        return <RelationshipView />;
      case 'memories':
        return <MemoriesView />;
      case 'calendar':
        return <CalendarView />;
      case 'calls':
        return <CallsView />;
      case 'location':
        return <LocationView />;
      case 'privacy':
        return <PrivacyCenterView />;
      case 'settings':
        return <SettingsView />;
      case 'admin':
        return (
          <div className="admin-workspace-layout">
            <Sidebar />
            <main className="admin-content-area">
              <AdminDashboard />
            </main>
          </div>
        );
      case 'chat':
      default:
        return (
          <div className="chat-workspace-layout">
            <Sidebar />
            <ChatArea />
          </div>
        );
    }
  };

  return (
    <div className="app-layout">
      <AlertBanner />
      <Header onOpenProfile={() => setIsProfileOpen(true)} />

      <div className="app-shell-body">
        {/* Vertical Navigation Dock (Desktop & Tablet) */}
        <SidebarDock />

        {/* Dynamic Workspace Container */}
        <div className="main-workspace">{renderMainView()}</div>
      </div>

      {/* Mobile Navigation Bar */}
      <MobileBottomNav />

      {/* Modals */}
      {isProfileOpen && (
        <ProfileModal onClose={() => setIsProfileOpen(false)} />
      )}

      <NotificationsModal />

      {/* Mock Calling Modal */}
      {activeCall && <CallModal />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
};

export default App;
