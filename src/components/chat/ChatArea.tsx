import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageBubble } from './MessageBubble';
import { GroupChatModal } from './GroupChatModal';
import { MediaAttachmentModal } from './MediaAttachmentModal';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { LocationSettingsModal } from '../location/LocationSettingsModal';
import { RelationshipDistancePanel } from './RelationshipDistancePanel';
import { Badge } from '../common/Badge';
import { Attachment } from '../../types';

export const ChatArea: React.FC = () => {
  const {
    currentUser,
    users,
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    startCall,
    setIsMobileSidebarOpen,
    replyingToMessage,
    setReplyingToMessage,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  const currentChatMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  const otherParticipant =
    activeConversation?.type === 'direct' && currentUser
      ? users.find(
          (u) =>
            activeConversation.participantIds.includes(u.id) &&
            u.id !== currentUser.id
        )
      : null;

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (!chatSearchQuery.trim()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChatMessages, chatSearchQuery]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !inputMessage.trim() || !currentUser) return;
    if (currentUser.status === 'suspended') return;

    sendMessage(activeConversationId, inputMessage);
    setInputMessage('');
  };

  const handleSendMediaAttachment = (caption: string, attachment: Attachment) => {
    if (!activeConversationId || !currentUser) return;
    sendMessage(activeConversationId, caption, [attachment]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (!activeConversation) {
    return (
      <main className="chat-area empty-chat-state">
        <div className="empty-content">
          <div className="empty-icon">💬</div>
          <h3>Select a Conversation</h3>
          <p>
            Choose a direct message with a friend or enter "Our Inner Circle" group chat preview to begin messaging.
          </p>
          <button
            className="btn-primary mobile-open-sidebar-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            Open Conversations
          </button>
        </div>
      </main>
    );
  }

  const isGroup = activeConversation.type === 'group';
  const isCurrentUserSuspended = currentUser?.status === 'suspended';

  // Filter messages if search query is entered
  const displayedMessages = chatSearchQuery.trim()
    ? currentChatMessages.filter((m) =>
        m.text.toLowerCase().includes(chatSearchQuery.toLowerCase().trim())
      )
    : currentChatMessages;

  return (
    <main className="chat-area">
      {/* Chat Area Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          <button
            className="mobile-back-btn"
            onClick={() => {
              setActiveConversationId(null);
              setIsMobileSidebarOpen(true);
            }}
            aria-label="Back to conversations"
          >
            ← Back
          </button>

          <div
            className="chat-header-avatar"
            style={{
              backgroundColor: isGroup
                ? '#4f46e5'
                : otherParticipant?.avatarBg || '#6b7280',
            }}
          >
            {isGroup ? '👥' : otherParticipant?.name.charAt(0) || '?'}
          </div>

          <div className="chat-header-info">
            <div className="chat-title-row">
              <h2 className="chat-title">
                {isGroup ? activeConversation.name : otherParticipant?.name || activeConversation.name}
              </h2>
              {isGroup ? (
                <Badge label="Group Preview" variant="primary" />
              ) : (
                <Badge
                  label={otherParticipant?.role === 'admin' ? 'Admin' : 'Member'}
                  variant={otherParticipant?.role === 'admin' ? 'primary' : 'neutral'}
                />
              )}
            </div>
            <span className="chat-subtitle">
              {isGroup
                ? `${activeConversation.participantIds.length} circle members`
                : otherParticipant?.email}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          {/* Chat Search Button */}
          <button
            className="btn-header-icon search-toggle-btn"
            onClick={() => {
              setIsSearchingChat(!isSearchingChat);
              if (isSearchingChat) setChatSearchQuery('');
            }}
            title="Search in this conversation"
            aria-label="Search conversation messages"
          >
            🔍
          </button>

          {!isGroup && otherParticipant && (
            <div className="direct-call-actions">
              <button
                className="btn-header-icon"
                onClick={() =>
                  startCall(activeConversation.id, otherParticipant.id, otherParticipant.name, 'voice')
                }
                title="Mock Voice Call (Prototype)"
                aria-label="Start Voice Call"
              >
                📞 Voice Call
              </button>
              <button
                className="btn-header-icon"
                onClick={() =>
                  startCall(activeConversation.id, otherParticipant.id, otherParticipant.name, 'video')
                }
                title="Mock Video Call (Prototype)"
                aria-label="Start Video Call"
              >
                📹 Video Call
              </button>
              <button
                className="btn-header-icon"
                onClick={() => setShowLocationModal(true)}
                title="Location Sharing Settings"
                aria-label="Open Location Settings"
              >
                📍 Location
              </button>
            </div>
          )}

          {isGroup && (
            <div className="group-header-actions">
              <button
                className="btn-header-icon"
                onClick={() => setShowGroupModal(true)}
                title="Add people to this group circle"
                aria-label="Add people to group"
              >
                ➕ Add People
              </button>
              <button
                className="btn-secondary btn-sm"
                onClick={() => setShowGroupModal(true)}
              >
                Circle Members ({activeConversation.participantIds.length})
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Inline Chat Search Box */}
      {isSearchingChat && (
        <div className="chat-search-bar-row">
          <span className="search-symbol">🔍</span>
          <input
            type="text"
            placeholder="Search messages in this chat..."
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            className="chat-search-input"
            autoFocus
          />
          {chatSearchQuery && (
            <button
              className="clear-chat-search-btn"
              onClick={() => setChatSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Relationship Distance Panel for 1-to-1 Long Distance Messaging */}
      {!isGroup && otherParticipant && currentUser && (
        <RelationshipDistancePanel
          currentUser={currentUser}
          partner={otherParticipant}
          onOpenLocationSettings={() => setShowLocationModal(true)}
        />
      )}

      {/* Message Stream */}
      <div className="messages-stream">
        <div className="stream-notice">
          <span>🔒 End-to-end invite circle • Messages & attachments stay in your local browser</span>
        </div>

        {displayedMessages.length === 0 ? (
          <div className="empty-messages-placeholder">
            <p>
              {chatSearchQuery
                ? `No messages matching "${chatSearchQuery}"`
                : 'No messages yet. Send the first hello!'}
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const sender = users.find((u) => u.id === msg.senderId);
            const isMine = msg.senderId === currentUser?.id;

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMine={isMine}
                sender={sender}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <footer className="chat-input-container">
        {isCurrentUserSuspended ? (
          <div className="suspended-warning-bar">
            <span>⚠️ Your account is suspended. You cannot send messages in this prototype.</span>
          </div>
        ) : (
          <div>
            {/* Replying Banner */}
            {replyingToMessage && (
              <div className="replying-banner">
                <div className="replying-info">
                  <span className="replying-label">Replying to {users.find((u) => u.id === replyingToMessage.senderId)?.name || 'User'}:</span>
                  <span className="replying-snippet">"{replyingToMessage.text.substring(0, 45)}"</span>
                </div>
                <button
                  type="button"
                  className="replying-close-btn"
                  onClick={() => setReplyingToMessage(null)}
                  title="Cancel reply"
                >
                  ✕
                </button>
              </div>
            )}

            {isRecordingVoiceNote ? (
              <VoiceNoteRecorder
                onSend={(att) => {
                  if (activeConversationId) {
                    sendMessage(activeConversationId, '', [att]);
                  }
                  setIsRecordingVoiceNote(false);
                }}
                onCancel={() => setIsRecordingVoiceNote(false)}
              />
            ) : (
              <form onSubmit={handleSendMessage} className="chat-input-form">
                {!isGroup && (
                  <button
                    type="button"
                    className="btn-attach"
                    onClick={() => setShowMediaModal(true)}
                    title="Attach photo or short video (<60s)"
                    aria-label="Attach photo or video"
                  >
                    📎
                  </button>
                )}

                <input
                  type="text"
                  className="chat-text-input"
                  placeholder={`Message ${isGroup ? 'Our Inner Circle' : otherParticipant?.name || 'chat'}...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                <button
                  type="button"
                  className="btn-attach btn-mic"
                  onClick={() => setIsRecordingVoiceNote(true)}
                  title="Record voice note"
                  aria-label="Record voice note"
                >
                  🎙️
                </button>

                <button
                  type="submit"
                  className="btn-primary btn-send"
                  disabled={!inputMessage.trim()}
                >
                  Send
                </button>
              </form>
            )}
          </div>
        )}
      </footer>

      {/* Group Preview Details Modal */}
      {showGroupModal && (
        <GroupChatModal
          conversation={activeConversation}
          users={users}
          onClose={() => setShowGroupModal(false)}
        />
      )}

      {/* Media Attachment Modal */}
      {showMediaModal && (
        <MediaAttachmentModal
          onClose={() => setShowMediaModal(false)}
          onSend={handleSendMediaAttachment}
        />
      )}

      {/* Location Settings Modal */}
      {showLocationModal && (
        <LocationSettingsModal onClose={() => setShowLocationModal(false)} />
      )}
    </main>
  );
};
