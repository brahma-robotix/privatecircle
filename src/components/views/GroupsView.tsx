import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GroupChatModal } from '../chat/GroupChatModal';
import { Badge } from '../common/Badge';

export const GroupsView: React.FC = () => {
  const {
    conversations,
    users,
    currentUser,
    setActiveConversationId,
    setCurrentView,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);

  const groupConversations = conversations.filter((c) => c.type === 'group');
  const mainGroup = groupConversations[0] || {
    id: 'conv-group-inner-circle',
    name: 'Our Inner Circle',
    participantIds: ['user-admin', 'user-girlfriend', 'user-friend1', 'user-friend2'],
    description: 'The exclusive invite-only space for Alex, Maya, Sam, and Jordan.',
    type: 'group',
  };

  const groupMembers = users.filter((u) => mainGroup.participantIds.includes(u.id));

  const handleOpenGroupChat = () => {
    setActiveConversationId(mainGroup.id);
    setCurrentView('chat');
  };

  return (
    <div className="view-container groups-view">
      <div className="view-header-block">
        <div className="view-title-group">
          <h2>Private Circles & Group Spaces</h2>
          <p className="view-description">
            Dedicated spaces for your closest circle. Strictly invite-only with zero public discovery.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          ➕ Add People to Circle
        </button>
      </div>

      {/* Main Group Circle Card */}
      <div className="group-detail-card">
        <div className="group-card-top">
          <div className="group-card-avatar">👥</div>
          <div className="group-card-title-col">
            <div className="group-title-row">
              <h3>{mainGroup.name}</h3>
              <Badge label="Inner Circle" variant="primary" />
            </div>
            <p className="group-card-desc">
              {mainGroup.description || 'Our intimate, invite-only circle.'}
            </p>
            <div className="group-card-meta">
              <span>👥 {groupMembers.length} Members</span>
              <span>•</span>
              <span>🔒 Private & Local</span>
            </div>
          </div>

          <div className="group-card-actions">
            <button
              className="btn-primary btn-md"
              onClick={handleOpenGroupChat}
            >
              💬 Open Circle Chat
            </button>
          </div>
        </div>

        <hr className="divider-subtle" />

        {/* Member Directory */}
        <div className="group-members-section">
          <div className="members-section-header">
            <h4>Circle Member Directory ({groupMembers.length})</h4>
            <button
              className="btn-link"
              onClick={() => setShowAddModal(true)}
            >
              + Add another friend
            </button>
          </div>

          <div className="members-grid">
            {groupMembers.map((member) => (
              <div key={member.id} className="member-card">
                <div
                  className="member-card-avatar"
                  style={{ backgroundColor: member.avatarBg }}
                >
                  {member.name.charAt(0)}
                </div>
                <div className="member-card-info">
                  <div className="member-name-row">
                    <span className="member-name">{member.name}</span>
                    {member.id === currentUser?.id && (
                      <span className="you-pill">You</span>
                    )}
                  </div>
                  <span className="member-email">{member.email}</span>
                  <div className="member-badge-row">
                    <Badge
                      label={member.role === 'admin' ? 'Admin' : 'Member'}
                      variant={member.role === 'admin' ? 'primary' : 'neutral'}
                      size="sm"
                    />
                    {member.status === 'suspended' ? (
                      <Badge label="Suspended" variant="danger" size="sm" />
                    ) : (
                      <Badge label="Active" variant="success" size="sm" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Privacy Principles */}
        <div className="circle-security-box">
          <div className="security-icon">🛡️</div>
          <div className="security-text">
            <strong>Strict Invitation Protocol:</strong>
            <p>
              Only existing members can propose invites, and every access request requires administrator approval.
              No search engine indexing, no algorithmic feeds, and no stranger requests.
            </p>
          </div>
        </div>
      </div>

      {showAddModal && (
        <GroupChatModal
          conversation={mainGroup}
          users={users}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};
