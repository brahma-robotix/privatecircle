import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storageService';
import { Badge } from '../common/Badge';

export const PrivacyCenterView: React.FC = () => {
  const {
    currentUser,
    users,
    privacySettings,
    updatePrivacySettings,
    revokeLocationPermissionForUser,
    revokeAllLocationPermissions,
    requestAccountDeletion,
  } = useApp();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  if (!currentUser) return null;

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExport = () => {
    StorageService.exportDataAsJson(
      `privatecircle-privacy-export-${currentUser.name.toLowerCase().replace(/\s+/g, '-')}.json`
    );
    showNotification('Personal data exported successfully.');
  };

  const handleRevokeSingle = (userId: string, userName: string) => {
    revokeLocationPermissionForUser(userId);
    showNotification(`Revoked location access for ${userName}.`);
  };

  const handleRevokeAll = () => {
    if (window.confirm('Are you sure you want to revoke location sharing for all members immediately?')) {
      revokeAllLocationPermissions();
      showNotification('All location sharing permissions have been revoked.');
    }
  };

  const handleConfirmDeleteAccount = () => {
    if (deleteConfirmText.trim().toLowerCase() === 'delete') {
      setShowDeleteModal(false);
      requestAccountDeletion();
    } else {
      alert('Please type "DELETE" to confirm account removal.');
    }
  };

  const permittedUsers = users.filter(
    (u) =>
      u.id !== currentUser.id &&
      privacySettings.allowedLocationUserIds.includes(u.id)
  );

  return (
    <div className="view-container privacy-center-view">
      <div className="view-header-block">
        <div className="view-title-group">
          <h2>Privacy Center</h2>
          <p className="view-description">
            Transparent, plain-language controls over who can see you, contact you, and access your location.
          </p>
        </div>

        <div className="privacy-header-badge">
          <Badge label="Client-Only Security • Zero Third-Party Tracking" variant="success" />
        </div>
      </div>

      {feedback && (
        <div className="privacy-feedback-banner" role="status">
          <span>✓ {feedback}</span>
        </div>
      )}

      <div className="privacy-grid">
        {/* Card 1: Communication & Presence */}
        <div className="privacy-card">
          <div className="card-header-icon-row">
            <span className="card-icon">💬</span>
            <div>
              <h3>Communication & Presence</h3>
              <p className="card-subtext">Manage who can reach you and observe your activity.</p>
            </div>
          </div>

          <div className="privacy-control-group">
            <div className="control-row">
              <div className="control-info">
                <span className="control-title">Who can contact you</span>
                <span className="control-desc">
                  Strangers cannot search for you. Only approved circle members can send messages.
                </span>
              </div>
              <select
                className="privacy-select"
                value={privacySettings.whoCanContact}
                onChange={(e) => {
                  updatePrivacySettings({ whoCanContact: e.target.value as any });
                  showNotification('Updated who can contact you.');
                }}
                aria-label="Who can contact you"
              >
                <option value="circle">Approved Circle Members</option>
                <option value="partner_only">Partner Only</option>
              </select>
            </div>

            <div className="control-row">
              <div className="control-info">
                <span className="control-title">Profile & bio visibility</span>
                <span className="control-desc">Controls who sees your name, photo, and bio details.</span>
              </div>
              <select
                className="privacy-select"
                value={privacySettings.profileVisibility}
                onChange={(e) => {
                  updatePrivacySettings({ profileVisibility: e.target.value as any });
                  showNotification('Updated profile visibility.');
                }}
                aria-label="Profile visibility"
              >
                <option value="circle">Approved Circle Members</option>
                <option value="partner_only">Partner Only</option>
              </select>
            </div>

            <div className="control-row">
              <div className="control-info">
                <span className="control-title">Online presence status</span>
                <span className="control-desc">Whether others see a green dot when you have the app open.</span>
              </div>
              <select
                className="privacy-select"
                value={privacySettings.onlineStatusVisibility}
                onChange={(e) => {
                  updatePrivacySettings({ onlineStatusVisibility: e.target.value as any });
                  showNotification('Updated online status visibility.');
                }}
                aria-label="Online status visibility"
              >
                <option value="circle">Visible to Circle</option>
                <option value="partner_only">Partner Only</option>
                <option value="hidden">Hidden Completely</option>
              </select>
            </div>

            <div className="control-row">
              <div className="control-info">
                <span className="control-title">Last-seen timestamp</span>
                <span className="control-desc">Shows when you were last active inside PrivateCircle.</span>
              </div>
              <select
                className="privacy-select"
                value={privacySettings.lastSeenVisibility}
                onChange={(e) => {
                  updatePrivacySettings({ lastSeenVisibility: e.target.value as any });
                  showNotification('Updated last-seen visibility.');
                }}
                aria-label="Last-seen visibility"
              >
                <option value="circle">Visible to Circle</option>
                <option value="partner_only">Partner Only</option>
                <option value="hidden">Hidden Completely</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 2: Location Sharing & Consent */}
        <div className="privacy-card">
          <div className="card-header-icon-row">
            <span className="card-icon">📍</span>
            <div>
              <h3>Location Sharing & Permissions</h3>
              <p className="card-subtext">
                Strictly off by default. Never tracked in the background without explicit consent.
              </p>
            </div>
          </div>

          <div className="privacy-control-group">
            <div className="toggle-setting-row">
              <div>
                <span className="control-title">Exact GPS Location Sharing</span>
                <p className="control-desc">
                  Share precise geographic coordinates (requires explicit consent).
                </p>
              </div>
              <button
                className={`switch-toggle ${privacySettings.exactLocationEnabled ? 'on' : 'off'}`}
                onClick={() => {
                  const newVal = !privacySettings.exactLocationEnabled;
                  updatePrivacySettings({ exactLocationEnabled: newVal });
                  showNotification(newVal ? 'Exact location enabled.' : 'Exact location disabled.');
                }}
                aria-label="Toggle Exact Location"
              >
                <span className="switch-slider" />
              </button>
            </div>

            <div className="toggle-setting-row">
              <div>
                <span className="control-title">Approximate (City-Level) Location</span>
                <p className="control-desc">
                  Show city name (e.g. Paris or New York) instead of precise latitude/longitude coordinates.
                </p>
              </div>
              <button
                className={`switch-toggle ${privacySettings.approximateLocationEnabled ? 'on' : 'off'}`}
                onClick={() => {
                  const newVal = !privacySettings.approximateLocationEnabled;
                  updatePrivacySettings({ approximateLocationEnabled: newVal });
                  showNotification(newVal ? 'Approximate location enabled.' : 'Approximate location disabled.');
                }}
                aria-label="Toggle Approximate Location"
              >
                <span className="switch-slider" />
              </button>
            </div>

            {/* Members With Location Access */}
            <div className="active-permissions-block">
              <span className="control-title">Members with Location Permission</span>
              <p className="control-desc">
                These specific circle members currently have permission to see your proximity:
              </p>

              {permittedUsers.length === 0 ? (
                <div className="no-permissions-box">
                  <span>🔒 No members have permission to view your location.</span>
                </div>
              ) : (
                <div className="permitted-users-list">
                  {permittedUsers.map((u) => (
                    <div key={u.id} className="permitted-user-row">
                      <div className="user-label-side">
                        <div
                          className="user-dot"
                          style={{ backgroundColor: u.avatarBg }}
                        />
                        <span className="user-label-name">{u.name} ({u.role})</span>
                      </div>
                      <button
                        className="btn-revoke"
                        onClick={() => handleRevokeSingle(u.id, u.name)}
                        aria-label={`Revoke location permission for ${u.name}`}
                        title={`Revoke location permission for ${u.name}`}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {permittedUsers.length > 0 && (
                <button
                  className="btn-danger btn-sm revoke-all-btn"
                  onClick={handleRevokeAll}
                >
                  🛑 Revoke All Location Permissions Immediately
                </button>
              )}
            </div>

            {/* Admin Bypass Warning Notice */}
            <div className="admin-protection-note">
              <span className="shield-icon">🛡️</span>
              <p>
                <strong>Administrator Protection:</strong> Circle administrators cannot bypass your location permissions or view your GPS. Admin access requires deliberate selection of "Partner + Admin" in sharing settings.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Translation & AI Discretion */}
        <div className="privacy-card">
          <div className="card-header-icon-row">
            <span className="card-icon">🌐</span>
            <div>
              <h3>Text Translation & AI Discretion</h3>
              <p className="card-subtext">Prevent unauthorized message transmission to cloud translation APIs.</p>
            </div>
          </div>

          <div className="privacy-control-group">
            <div className="toggle-setting-row">
              <div>
                <span className="control-title">Require Explicit Consent for External Translation</span>
                <p className="control-desc">
                  When enabled, messages are never sent to third-party translation servers without deliberate confirmation.
                </p>
              </div>
              <button
                className={`switch-toggle ${privacySettings.externalTranslationConsent ? 'on' : 'off'}`}
                onClick={() => {
                  const newVal = !privacySettings.externalTranslationConsent;
                  updatePrivacySettings({ externalTranslationConsent: newVal });
                  showNotification(newVal ? 'External translation consent required.' : 'Standard local translation active.');
                }}
                aria-label="Toggle External Translation Consent"
              >
                <span className="switch-slider" />
              </button>
            </div>

            <div className="toggle-setting-row">
              <div>
                <span className="control-title">Automatic Message Translation</span>
                <p className="control-desc">
                  Automatically translate foreign language messages in chat without manual click.
                </p>
              </div>
              <button
                className={`switch-toggle ${privacySettings.automaticTranslationEnabled ? 'on' : 'off'}`}
                onClick={() => {
                  const newVal = !privacySettings.automaticTranslationEnabled;
                  updatePrivacySettings({ automaticTranslationEnabled: newVal });
                  showNotification(newVal ? 'Automatic translation enabled.' : 'Automatic translation disabled.');
                }}
                aria-label="Toggle Automatic Translation"
              >
                <span className="switch-slider" />
              </button>
            </div>

            <div className="safe-translation-callout">
              <span>🔒 <strong>Current Status:</strong> PrivateCircle uses an in-browser local translation dictionary. No external AI services receive your intimate relationship messages.</span>
            </div>
          </div>
        </div>

        {/* Card 4: Notification Previews */}
        <div className="privacy-card">
          <div className="card-header-icon-row">
            <span className="card-icon">🔔</span>
            <div>
              <h3>Notification Previews</h3>
              <p className="card-subtext">Protect your personal chats from prying eyes on locked screens.</p>
            </div>
          </div>

          <div className="privacy-control-group">
            <div className="toggle-setting-row">
              <div>
                <span className="control-title">Discreet Notification Previews</span>
                <p className="control-desc">
                  Hides message content on notifications. Displays "New private message from Maya" instead of revealing sensitive text.
                </p>
              </div>
              <button
                className={`switch-toggle ${privacySettings.discreetNotificationPreviews ? 'on' : 'off'}`}
                onClick={() => {
                  const newVal = !privacySettings.discreetNotificationPreviews;
                  updatePrivacySettings({ discreetNotificationPreviews: newVal });
                  showNotification(newVal ? 'Discreet previews enabled.' : 'Full message previews enabled.');
                }}
                aria-label="Toggle Discreet Notifications"
              >
                <span className="switch-slider" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 5: Data Rights & Account Deletion */}
        <div className="privacy-card full-width">
          <div className="card-header-icon-row">
            <span className="card-icon">🗄️</span>
            <div>
              <h3>Your Data Rights & Deletion</h3>
              <p className="card-subtext">Download your complete private archive or purge your presence.</p>
            </div>
          </div>

          <div className="data-rights-row">
            <div className="data-right-box">
              <h4>Export Your Personal Data</h4>
              <p>Download a complete JSON export of your profile, messages, shared photos, and audit logs.</p>
              <button className="btn-secondary btn-sm" onClick={handleExport}>
                📥 Export Personal Archive (JSON)
              </button>
            </div>

            <div className="data-right-box danger-box">
              <h4>Request Account Deletion</h4>
              <p>Permanently remove your account, delete your messages, and revoke all active permissions.</p>
              <button
                className="btn-danger btn-sm"
                onClick={() => setShowDeleteModal(true)}
              >
                🗑️ Delete Account & Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-box delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Account Deletion</h3>
              <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="warning-text">
                ⚠️ This will permanently remove <strong>{currentUser.name}</strong> ({currentUser.email}) from PrivateCircle. All local cache and permissions will be wiped immediately.
              </p>
              <p className="confirm-instruct">Type <strong>DELETE</strong> below to confirm:</p>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="rel-input"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleConfirmDeleteAccount}
                disabled={deleteConfirmText.trim().toLowerCase() !== 'delete'}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
