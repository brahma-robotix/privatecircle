import React, { useState } from 'react';
import { Message, User } from '../../types';
import { useApp } from '../../context/AppContext';
import { VoiceNotePlayer } from './VoiceNotePlayer';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  sender?: User;
}

const COMMON_EMOJIS = ['❤️', '👍', '😂', '🔥', '🥰', '✨'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMine,
  sender,
}) => {
  const {
    currentUser,
    toggleReaction,
    editMessage,
    deleteMessage,
    translateMessage,
    setReplyingToMessage,
    activeConversationId,
  } = useApp();

  const [showPicker, setShowPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const senderInitial = sender ? sender.name.charAt(0) : '?';
  const senderColor = sender ? sender.avatarBg : '#6b7280';
  const senderDisplayName = sender ? sender.name : 'Unknown User';

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !editText.trim()) return;
    editMessage(activeConversationId, message.id, editText);
    setIsEditing(false);
  };

  const handleToggleReaction = (emoji: string) => {
    if (!activeConversationId) return;
    toggleReaction(activeConversationId, message.id, emoji);
    setShowPicker(false);
  };

  const handleTranslate = () => {
    if (!activeConversationId) return;
    translateMessage(activeConversationId, message.id);
  };

  return (
    <div className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && (
        <div
          className="message-avatar"
          style={{ backgroundColor: senderColor }}
          title={senderDisplayName}
        >
          {senderInitial}
        </div>
      )}

      <div className="message-content-wrapper">
        {!isMine && (
          <span className="message-sender-name">{senderDisplayName}</span>
        )}

        <div className={`message-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
          {/* Quoted Reply Preview */}
          {message.replyTo && (
            <div className="bubble-reply-quote">
              <span className="reply-quote-sender">Replying to {message.replyTo.senderName}:</span>
              <p className="reply-quote-text">"{message.replyTo.textSnippet}"</p>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="bubble-attachments-container">
              {message.attachments.map((att) => (
                <div key={att.id} className="bubble-attachment-item">
                  {att.type === 'audio' ? (
                    <VoiceNotePlayer
                      url={att.url}
                      durationSeconds={att.durationSeconds}
                      waveform={att.waveform}
                      isMine={isMine}
                    />
                  ) : att.type === 'image' ? (
                    <>
                      <img
                        src={att.url}
                        alt={att.name}
                        className="bubble-attachment-img"
                        loading="lazy"
                      />
                      <span className="bubble-attachment-label">📸 Photo</span>
                    </>
                  ) : (
                    <>
                      <video
                        src={att.url}
                        controls
                        className="bubble-attachment-video"
                      />
                      <span className="bubble-attachment-label">🎬 Short Video (&lt;60s)</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message Text or Inline Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="bubble-edit-form">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="bubble-edit-input"
                autoFocus
              />
              <div className="bubble-edit-actions">
                <button type="submit" className="btn-edit-save">Save</button>
                <button
                  type="button"
                  className="btn-edit-cancel"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {message.text && (
                <p className="message-text">
                  {message.text}
                  {message.isEdited && <span className="message-edited-tag"> (edited)</span>}
                </p>
              )}

              {/* Translation Display */}
              {message.translatedText && (
                <div className="message-translated-box">
                  <div className="translation-header">
                    <span className="translation-badge">🌐 Translation</span>
                  </div>
                  <p className="translation-text">{message.translatedText}</p>
                </div>
              )}
            </>
          )}

          <div className="bubble-bottom-row">
            <span className="message-time">{message.timestamp}</span>

            {/* Quick Action Buttons */}
            <div className="bubble-micro-actions">
              <button
                type="button"
                className="micro-action-btn"
                onClick={() => setShowPicker(!showPicker)}
                title="Add Reaction"
                aria-label="Add reaction"
              >
                😊
              </button>

              <button
                type="button"
                className="micro-action-btn"
                onClick={() => setReplyingToMessage(message)}
                title="Reply to message"
                aria-label="Reply to message"
              >
                ↩️
              </button>

              {message.text && (
                <button
                  type="button"
                  className="micro-action-btn"
                  onClick={handleTranslate}
                  title={message.translatedText ? 'Hide translation' : 'Translate message'}
                  aria-label="Translate message"
                >
                  🌐
                </button>
              )}

              {isMine && !isEditing && (
                <>
                  <button
                    type="button"
                    className="micro-action-btn"
                    onClick={() => setIsEditing(true)}
                    title="Edit message"
                    aria-label="Edit message"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="micro-action-btn delete-btn"
                    onClick={() => activeConversationId && deleteMessage(activeConversationId, message.id)}
                    title="Delete message"
                    aria-label="Delete message"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Emoji Picker Popover */}
          {showPicker && (
            <div className="emoji-picker-popover">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className="emoji-picker-btn"
                  onClick={() => handleToggleReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reaction Chips Display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="message-reactions-row">
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              const hasReacted = currentUser ? userIds.includes(currentUser.id) : false;
              return (
                <button
                  key={emoji}
                  className={`reaction-chip ${hasReacted ? 'active' : ''}`}
                  onClick={() => handleToggleReaction(emoji)}
                  title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
                >
                  <span>{emoji}</span>
                  <span className="reaction-count">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
