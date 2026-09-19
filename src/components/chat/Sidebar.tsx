import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    users,
    conversations,
    activeConversationId,
    setActiveConversationId,
    currentView,
    setCurrentView,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const groupConversations = filteredConversations.filter((c) => c.type === 'group');
  const directConversations = filteredConversations.filter((c) => c.type === 'direct');

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setCurrentView('chat');
    setIsMobileSidebarOpen(false);
  };

  const getDirectChatTargetUser = (participantIds: string[]) => {
    const targetId = participantIds.find((id) => id !== currentUser.id) || participantIds[0];
    return users.find((u) => u.id === targetId);
  };

  return (
    <aside className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h3>Private Conversations</h3>
          <button
            className="mobile-close-sidebar-btn"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="conversations-scroll-list">
        {/* Group Circles Section */}
        <div className="section-label">
          <span>GROUP CIRCLES</span>
        </div>

        {groupConversations.length === 0 ? (
          <div className="empty-category">No group conversations found</div>
        ) : (
          groupConversations.map((conv) => {
            const isActive =
              currentView === 'chat' && activeConversationId === conv.id;

            return (
              <button
                key={conv.id}
                className={`conv-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                <div className="conv-avatar group-avatar">👥</div>
                <div className="conv-body">
                  <div className="conv-top-row">
                    <span className="conv-name">{conv.name}</span>
                    <span className="conv-time">{conv.lastMessageTimestamp}</span>
                  </div>
                  <div className="conv-bottom-row">
                    <span className="conv-last-msg">
                      {conv.lastMessage || 'No messages yet'}
                    </span>
                    <Badge label="Circle" variant="primary" />
                  </div>
                </div>
              </button>
            );
          })
        )}

        {/* Direct Messages Section */}
        <div className="section-label">
          <span>DIRECT MESSAGES</span>
        </div>

        {directConversations.length === 0 ? (
          <div className="empty-category">No direct chats found</div>
        ) : (
          directConversations.map((conv) => {
            const targetUser = getDirectChatTargetUser(conv.participantIds);
            const isActive =
              currentView === 'chat' && activeConversationId === conv.id;

            return (
              <button
                key={conv.id}
                className={`conv-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                <div
                  className="conv-avatar"
                  style={{
                    backgroundColor: targetUser?.avatarBg || '#6366f1',
                  }}
                >
                  {targetUser?.name.charAt(0) || conv.name.charAt(0)}
                </div>
                <div className="conv-body">
                  <div className="conv-top-row">
                    <span className="conv-name">
                      {targetUser ? targetUser.name : conv.name}
                    </span>
                    <span className="conv-time">{conv.lastMessageTimestamp}</span>
                  </div>
                  <div className="conv-bottom-row">
                    <span className="conv-last-msg">
                      {conv.lastMessage || 'No messages yet'}
                    </span>
                    {targetUser?.status === 'suspended' && (
                      <Badge label="Suspended" variant="danger" />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Admin Quick Action in Sidebar */}
      {isAdmin && (
        <div className="sidebar-footer">
          <button
            className={`admin-shortcut-btn ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('admin');
              setIsMobileSidebarOpen(false);
            }}
          >
            <span className="shortcut-icon">🛡️</span>
            <span>Open Admin Dashboard</span>
          </button>
        </div>
      )}
    </aside>
  );
};
