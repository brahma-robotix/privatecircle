import React, { useState } from 'react';
import { Conversation, User } from '../../types';
import { Badge } from '../common/Badge';
import { useApp } from '../../context/AppContext';

interface GroupChatModalProps {
  conversation: Conversation;
  users: User[];
  onClose: () => void;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  conversation,
  users,
  onClose,
}) => {
  const { addMemberToGroup } = useApp();
  const [notification, setNotification] = useState<string | null>(null);

  const participants = users.filter((u) =>
    conversation.participantIds.includes(u.id)
  );

  const availableMembers = users.filter(
    (u) => !conversation.participantIds.includes(u.id) && u.status === 'active'
  );

  const handleAddMember = (userId: string, userName: string) => {
    addMemberToGroup(conversation.id, userId);
    setNotification(`Added ${userName} to ${conversation.name}!`);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card group-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h3>👥 {conversation.name}</h3>
            <span className="modal-subtitle">Private Group Circle • Invite-Only</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {notification && (
            <div className="admin-notification" role="status">
              <span>🎉 {notification}</span>
            </div>
          )}

          <div className="group-info-card">
            <h4>About this Circle</h4>
            <p>
              This is a private group for you, your girlfriend, and your close trusted circle. Messages and location calculations stay strictly within this circle.
            </p>
            <div className="group-meta-tags">
              <span className="tag">🔒 Invite-Only</span>
              <span className="tag">🚫 No Public Discovery</span>
              <span className="tag">💬 {participants.length} Current Members</span>
            </div>
          </div>

          {/* Section: Add People to Group */}
          <div className="add-members-section">
            <div className="section-title-row">
              <h4>➕ Add People to Group</h4>
              <span className="prototype-tag">Invite-Only Access</span>
            </div>
            <p className="section-subtext">
              Add approved circle members directly into this conversation:
            </p>

            {availableMembers.length === 0 ? (
              <div className="all-members-added-box">
                <span className="check-icon">✓</span>
                <span>
                  All approved circle members ({participants.length} people) are already part of this group.
                </span>
              </div>
            ) : (
              <div className="available-members-list">
                {availableMembers.map((member) => (
                  <div key={member.id} className="available-member-row">
                    <div className="member-meta">
                      <div
                        className="member-mini-avatar"
                        style={{ backgroundColor: member.avatarBg }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <span className="member-row-name">{member.name}</span>
                        <span className="member-row-email">{member.email}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-action btn-success"
                      onClick={() => handleAddMember(member.id, member.name)}
                      aria-label={`Add ${member.name} to group`}
                    >
                      ➕ Add to Group
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Current Members */}
          <div className="group-members-section">
            <h4>Current Circle Members ({participants.length})</h4>
            <div className="member-list">
              {participants.map((member) => (
                <div key={member.id} className="member-item">
                  <div
                    className="member-avatar"
                    style={{ backgroundColor: member.avatarBg }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="member-details">
                    <span className="member-name">{member.name}</span>
                    <span className="member-email">{member.email}</span>
                  </div>
                  <Badge
                    label={member.role === 'admin' ? 'Admin' : 'Member'}
                    variant={member.role === 'admin' ? 'primary' : 'neutral'}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close Circle Info
          </button>
        </div>
      </div>
    </div>
  );
};
