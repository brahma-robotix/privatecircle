import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { User } from '../../types';

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    users,
    invitations,
    locationAuditLog,
    recordLocationAudit,
    approveInvitation,
    rejectInvitation,
    createInvitationCode,
    toggleSuspendMember,
    removeMember,
    authMode,
    refreshAdminData,
  } = useApp();

  const [notification, setNotification] = useState<string | null>(null);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [viewedLocations, setViewedLocations] = useState<Record<string, boolean>>({});

  // Access check
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="admin-access-denied">
        <div className="denied-card">
          <span className="denied-icon">🚫</span>
          <h3>Access Restricted</h3>
          <p>
            The Admin Dashboard is only visible to circle administrators. Your account has standard member privileges.
          </p>
        </div>
      </div>
    );
  }

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const PUBLIC_TUNNEL_URL = 'https://aquarium-roads-national-signing.trycloudflare.com';

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    showFeedback(`📋 Copied invite code "${code}" to clipboard!`);
  };

  const copyInviteLink = (code: string) => {
    // If running on localhost, use the live public HTTPS tunnel so phones and remote devices can open it seamlessly
    const baseUrl =
      typeof window !== 'undefined' && window.location.origin.includes('localhost')
        ? PUBLIC_TUNNEL_URL
        : typeof window !== 'undefined'
          ? window.location.origin
          : PUBLIC_TUNNEL_URL;

    const link = `${baseUrl}?invite=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(link);
    showFeedback(`🔗 Copied mobile-ready invite link to clipboard!`);
  };

  const handleApprove = async (id: string, email: string) => {
    if (authMode === 'mock') {
      approveInvitation(id);
      showFeedback(`[Prototype Action] Approved invitation for "${email}".`);
      return;
    }

    const res = await approveInvitation(id);
    if (res.error) {
      showFeedback(`⚠️ Failed to approve: ${res.error}`);
    } else {
      showFeedback(`Approved invitation for "${email}".`);
    }
  };

  const handleReject = async (id: string, email: string) => {
    if (authMode === 'mock') {
      rejectInvitation(id);
      showFeedback(`[Prototype Action] Rejected invitation for "${email}".`);
      return;
    }

    const res = await rejectInvitation(id);
    if (res.error) {
      showFeedback(`⚠️ Failed to reject: ${res.error}`);
    } else {
      showFeedback(`Rejected invitation for "${email}".`);
    }
  };

  const handleToggleSuspend = async (id: string, name: string, currentStatus: string) => {
    if (authMode === 'mock') {
      toggleSuspendMember(id);
      const newStatus = currentStatus === 'active' ? 'suspended' : 'reactivated';
      showFeedback(`[Prototype Action] ${name} has been ${newStatus}.`);
      return;
    }

    const res = await toggleSuspendMember(id);
    if (res.error) {
      showFeedback(`⚠️ Failed: ${res.error}`);
    } else {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'reactivated';
      showFeedback(`${name} has been ${newStatus}.`);
    }
  };

  const handleRemove = (id: string, name: string) => {
    const confirmed = window.confirm(
      authMode === 'supabase'
        ? `Are you sure you want to remove ${name} from this private circle?`
        : `[Prototype Action] Are you sure you want to simulate removing ${name} from this private circle?`
    );
    if (confirmed) {
      removeMember(id);
      showFeedback(
        authMode === 'supabase'
          ? `Removed ${name} from circle.`
          : `[Prototype Action] Simulated removal of ${name}.`
      );
    }
  };

  const handleCreateNewInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await createInvitationCode(newInviteEmail.trim());
      if (res.error) {
        showFeedback(`⚠️ ${res.error}`);
      } else if (res.invitation) {
        setLatestCode(res.invitation.code || null);
        showFeedback(`Created invitation for "${newInviteEmail.trim()}". Code: ${res.invitation.code}`);
        setNewInviteEmail('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewLocation = (member: User) => {
    setViewedLocations((prev) => ({ ...prev, [member.id]: true }));
    recordLocationAudit(
      'viewed_by_admin',
      `${currentUser.name} viewed coordinates for ${member.name}.`,
      member.id,
      member.name
    );
    showFeedback(
      `[Audit Logged] Viewed exact location for ${member.name}. An audit record has been created.`
    );
  };

  const pendingInvites = invitations.filter((inv) => inv.status === 'pending');
  const pastInvites = invitations.filter((inv) => inv.status !== 'pending');

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-title">
          <h2>🛡️ Circle Administration & Privacy Audit</h2>
          <span className="admin-header-badge">
            {authMode === 'supabase' ? '🟢 Live Supabase Connected' : '🧪 Local Simulation'}
          </span>
        </div>
        <p className="admin-description">
          Manage membership, review pending access requests, and audit member location privacy.
        </p>
      </div>

      {notification && (
        <div className="admin-notification" role="status">
          <span>ℹ️ {notification}</span>
        </div>
      )}

      {/* Real Invite Form */}
      <div className="admin-card invite-simulation-card">
        <div className="card-title-row">
          <h3>Create New Circle Invitation</h3>
          {authMode === 'supabase' && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => refreshAdminData()}
              title="Refresh invitations and member lists"
            >
              🔄 Refresh Data
            </button>
          )}
        </div>
        <p className="section-note">
          Issue a private invite token to a partner or trusted friend. Only users with an approved invitation code can register into your private circle.
        </p>
        <form onSubmit={handleCreateNewInvite} className="invite-form">
          <input
            type="email"
            placeholder="Enter trusted friend or partner's email address..."
            value={newInviteEmail}
            onChange={(e) => setNewInviteEmail(e.target.value)}
            className="invite-input"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!newInviteEmail.trim() || isSubmitting}
          >
            {isSubmitting ? 'Generating...' : 'Generate Invite Code'}
          </button>
        </form>

        {latestCode && (
          <div
            className="latest-invite-alert"
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1.25rem',
              backgroundColor: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block' }}>
                Recently Generated Invitation Code:
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: '#e11d48', fontWeight: 'bold' }}>
                {latestCode}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-action btn-secondary"
                onClick={() => copyToClipboard(latestCode)}
                title="Copy code only"
              >
                📋 Copy Code
              </button>
              <button
                type="button"
                className="btn-action btn-success"
                onClick={() => copyInviteLink(latestCode)}
                title="Copy direct registration link with code"
              >
                🔗 Copy Invite Link
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#18181b', borderRadius: '6px', fontSize: '0.8rem', color: '#a1a1aa', border: '1px solid #27272a' }}>
          📱 <strong style={{ color: '#f4f4f5' }}>Live Mobile Link:</strong> Your invite link is connected to a secure public HTTPS tunnel (<code style={{ color: '#e11d48' }}>{PUBLIC_TUNNEL_URL}</code>). You can open it on <strong>any phone or device anywhere</strong>!
        </div>
      </div>

      {/* Approved Members Table */}
      <div className="admin-card">
        <div className="card-title-row">
          <h3>Approved Circle Members ({users.length})</h3>
          <span className="prototype-tag">Local Simulation</span>
        </div>
        <p className="section-note">
          These people have access to direct messaging and group circles.
        </p>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Bio / Note</th>
                <th>Prototype Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser.id;

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="member-cell">
                        <div
                          className="member-mini-avatar"
                          style={{ backgroundColor: user.avatarBg }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="member-cell-name">
                            {user.name} {isSelf && '(You)'}
                          </div>
                          <div className="member-cell-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge
                        label={user.role === 'admin' ? 'Admin' : 'Member'}
                        variant={user.role === 'admin' ? 'primary' : 'neutral'}
                      />
                    </td>
                    <td>
                      <Badge
                        label={user.status === 'active' ? 'Active' : 'Suspended'}
                        variant={user.status === 'active' ? 'success' : 'danger'}
                      />
                    </td>
                    <td className="bio-cell">{user.bio || '—'}</td>
                    <td>
                      {isSelf ? (
                        <span className="self-action-note">Current Session</span>
                      ) : (
                        <div className="action-buttons-group">
                          <button
                            className={`btn-action ${user.status === 'active' ? 'btn-warn' : 'btn-success'}`}
                            onClick={() =>
                              handleToggleSuspend(user.id, user.name, user.status)
                            }
                            title="Suspend or activate member"
                          >
                            {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                          <button
                            className="btn-action btn-danger"
                            onClick={() => handleRemove(user.id, user.name)}
                            title="Simulate removing member"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW: Member Location Privacy & Admin Access Control */}
      <div className="admin-card">
        <div className="card-title-row">
          <h3>Member Location Privacy & Admin Access</h3>
          <span className="prototype-tag">Explicit Consent Only</span>
        </div>
        <p className="section-note">
          Admins do NOT have automatic access to members' exact locations. Members must explicitly opt in.
        </p>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Location Sharing</th>
                <th>Admin Access Consent</th>
                <th>Exact Location (Strict Consent)</th>
              </tr>
            </thead>
            <tbody>
              {users.map((member) => {
                const loc = member.locationSettings;
                const isLocEnabled = loc?.enabled;
                const hasAdminConsent = loc?.audience === 'partner_and_admin';
                const hasRevealed = viewedLocations[member.id];

                return (
                  <tr key={`loc-perm-${member.id}`}>
                    <td>
                      <strong>{member.name}</strong>
                    </td>
                    <td>
                      <Badge
                        label={isLocEnabled ? 'Enabled' : 'Disabled'}
                        variant={isLocEnabled ? 'success' : 'neutral'}
                      />
                    </td>
                    <td>
                      <Badge
                        label={hasAdminConsent ? 'Consent Granted' : 'Restricted (Partner Only)'}
                        variant={hasAdminConsent ? 'primary' : 'warning'}
                      />
                    </td>
                    <td>
                      {!hasAdminConsent ? (
                        <span className="text-restricted">
                          🔒 Location Hidden (No admin consent)
                        </span>
                      ) : hasRevealed ? (
                        <div className="revealed-location-box">
                          <span>
                            📍 {loc?.coordinates?.city} ({loc?.coordinates?.latitude},{' '}
                            {loc?.coordinates?.longitude})
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-action btn-warn"
                          onClick={() => handleViewLocation(member)}
                        >
                          👁️ View Location (Audit Logged)
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW: Location Access Audit Records Table */}
      <div className="admin-card">
        <div className="card-title-row">
          <h3>Location Access Audit Log ({locationAuditLog.length})</h3>
          <span className="prototype-tag">Audit Trail</span>
        </div>
        <p className="section-note">
          Audit trail tracking whenever location consent is granted, revoked, or viewed.
        </p>

        {locationAuditLog.length === 0 ? (
          <div className="empty-table-placeholder">
            <p>No audit records yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {locationAuditLog.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-xs">{log.timestamp}</td>
                    <td>
                      <Badge
                        label={log.action.replace('_', ' ').toUpperCase()}
                        variant={
                          log.action === 'granted_admin'
                            ? 'success'
                            : log.action === 'revoked_admin'
                              ? 'danger'
                              : 'neutral'
                        }
                      />
                    </td>
                    <td>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Table */}
      <div className="admin-card">
        <div className="card-title-row">
          <h3>Pending Access Requests ({pendingInvites.length})</h3>
          <span className="prototype-tag">Actionable Mockup</span>
        </div>
        <p className="section-note">
          Invitations requested by circle members awaiting administrator approval.
        </p>

        {pendingInvites.length === 0 ? (
          <div className="empty-table-placeholder">
            <p>No pending invitations at this time.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Requested Email</th>
                  <th>Invite Code</th>
                  <th>Invited By</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Review Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-semibold">{inv.email}</td>
                    <td>
                      {inv.code ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', color: '#e11d48', fontSize: '0.85rem' }}>
                            {inv.code}
                          </span>
                          <button
                            type="button"
                            className="btn-action"
                            onClick={() => copyToClipboard(inv.code!)}
                            title="Copy invite code"
                            style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                          >
                            📋
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-success"
                            onClick={() => copyInviteLink(inv.code!)}
                            title="Copy ready-to-click invite link"
                            style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                          >
                            🔗
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#71717a' }}>—</span>
                      )}
                    </td>
                    <td>{inv.invitedBy}</td>
                    <td>{inv.createdAt}</td>
                    <td>
                      <Badge label="Pending Approval" variant="warning" />
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          className="btn-action btn-success"
                          onClick={() => handleApprove(inv.id, inv.email)}
                        >
                          {authMode === 'supabase' ? '✓ Approve' : '✓ Approve (Demo)'}
                        </button>
                        <button
                          className="btn-action btn-danger"
                          onClick={() => handleReject(inv.id, inv.email)}
                        >
                          {authMode === 'supabase' ? '✕ Reject' : '✕ Reject (Demo)'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past / Processed Invitations */}
      <div className="admin-card">
        <div className="card-title-row">
          <h3>Past Invitation Audit Log ({pastInvites.length})</h3>
        </div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Invited By</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {pastInvites.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.email}</td>
                  <td>{inv.invitedBy}</td>
                  <td>
                    <Badge
                      label={inv.status.toUpperCase()}
                      variant={inv.status === 'approved' ? 'success' : 'danger'}
                    />
                  </td>
                  <td>{inv.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
