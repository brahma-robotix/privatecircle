import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storageService';
import { DeviceSessionService } from '../../services/deviceSessionService';
import { Badge } from '../common/Badge';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    users,
    updateUserProfile,
    locationAuditLog,
    resetToMockData,
    deviceSessions,
    terminateDeviceSession,
    terminateAllOtherSessions,
  } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarBg, setAvatarBg] = useState(currentUser?.avatarBg || '#6366f1');
  const [pinLockEnabled, setPinLockEnabled] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Device Sessions State
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  if (!currentUser) return null;

  const mySessions = deviceSessions.filter((s) => s.userId === currentUser.id);
  const currentSession = mySessions.find((s) => s.isCurrent) || mySessions[0];
  const otherSessions = mySessions.filter((s) => s.id !== currentSession?.id);

  const handleConfirmReauth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reauthPassword.trim()) {
      setReauthError('Please enter your passcode to confirm.');
      return;
    }
    terminateAllOtherSessions();
    setShowReauthModal(false);
    setReauthPassword('');
    setReauthError(null);
    setSessionNotice('Signed out all other active devices.');
    setTimeout(() => setSessionNotice(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({ name, bio, avatarBg });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportData = () => {
    StorageService.exportDataAsJson(`privatecircle-backup-${currentUser.name.toLowerCase().replace(/\s+/g, '-')}.json`);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all mock conversations and settings back to default?')) {
      resetToMockData();
    }
  };

  const AVATAR_COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#0ea5e9', // Sky blue
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
  ];

  return (
    <div className="view-container settings-view">
      <div className="view-header-block">
        <div className="view-title-group">
          <h2>Settings & Privacy Vault</h2>
          <p className="view-description">
            Customize your private profile, manage encrypted browser storage, and configure security controls.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile Settings Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>User Profile</h3>
            <Badge
              label={currentUser.role === 'admin' ? 'Circle Admin' : 'Circle Member'}
              variant={currentUser.role === 'admin' ? 'primary' : 'neutral'}
            />
          </div>

          <form onSubmit={handleSaveProfile} className="settings-form">
            <div className="form-avatar-preview-row">
              <div
                className="preview-avatar"
                style={{ backgroundColor: avatarBg }}
              >
                {name.charAt(0) || currentUser.name.charAt(0)}
              </div>
              <div className="color-swatch-list">
                <span className="swatch-label">Avatar Color</span>
                <div className="swatches">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`swatch-btn ${avatarBg === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setAvatarBg(c)}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rel-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={currentUser.email}
                disabled
                className="rel-input disabled"
              />
              <span className="form-hint">Used for invite verification</span>
            </div>

            <div className="form-group">
              <label>Bio / Status Message</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="rel-textarea"
                rows={2}
              />
            </div>

            <div className="form-actions-row">
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
              {saveSuccess && (
                <span className="save-success-msg">✓ Profile updated!</span>
              )}
            </div>
          </form>
        </div>

        {/* Privacy & Discretion Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>Discretion & Local Lock</h3>
            <Badge label="Client-Only" variant="success" />
          </div>

          <div className="settings-toggle-group">
            <div className="toggle-row">
              <div>
                <span className="toggle-title">Simulated PIN App Lock</span>
                <p className="toggle-desc">
                  Require a 4-digit code before opening private couple chats.
                </p>
              </div>
              <button
                className={`switch-toggle ${pinLockEnabled ? 'on' : 'off'}`}
                onClick={() => setPinLockEnabled(!pinLockEnabled)}
                aria-label="Toggle PIN Lock"
              >
                <span className="switch-slider" />
              </button>
            </div>

            {pinLockEnabled && (
              <div className="pin-code-input-row">
                <label>Set 4-digit passcode:</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="rel-input pin-input"
                />
              </div>
            )}
          </div>

          <hr className="divider-subtle" />

          <div className="settings-section-sub">
            <h4>Data Backup & Local Vault</h4>
            <p className="section-sub-desc">
              Your messages, milestones, and shared photos reside inside your browser. Export a portable JSON backup anytime.
            </p>

            <div className="settings-btn-group">
              <button
                className="btn-secondary btn-sm"
                onClick={handleExportData}
              >
                📥 Export Local Data (JSON)
              </button>
              <button
                className="btn-danger btn-sm"
                onClick={handleResetData}
              >
                ⚠️ Reset to Initial Demo Data
              </button>
            </div>
          </div>
        </div>

        {/* Trusted Devices & Active Sessions Card */}
        <div className="settings-card full-width trusted-devices-card">
          <div className="settings-card-header">
            <div>
              <h3>📱 Trusted Devices & Active Sessions</h3>
              <p className="card-subtext">
                Manage hardware and browser sessions authorized to access your PrivateCircle account.
              </p>
            </div>
            <span className="sessions-count-pill">{mySessions.length} Active Sessions</span>
          </div>

          {sessionNotice && (
            <div className="session-toast" role="status">
              <span>{sessionNotice}</span>
            </div>
          )}

          {/* Current Device Section */}
          <div className="current-device-box">
            <div className="device-icon-col">
              <span className="device-large-icon">
                {currentSession ? DeviceSessionService.getDeviceIcon(currentSession.deviceName) : '💻'}
              </span>
            </div>
            <div className="device-info-col">
              <div className="device-name-line">
                <span className="device-title">{currentSession?.deviceName || 'This Browser'}</span>
                <span className="current-badge">✓ THIS DEVICE (CURRENT)</span>
              </div>
              <p className="device-meta-sub">
                {currentSession?.browser} • {currentSession?.approxLocation} • <span className="active-highlight">Active Now</span>
              </p>
            </div>
          </div>

          {/* Other Active Sessions List */}
          <div className="other-sessions-section">
            <div className="other-sessions-header">
              <h4>Other Active Devices ({otherSessions.length})</h4>
              {otherSessions.length > 0 && (
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  onClick={() => setShowReauthModal(true)}
                  aria-label="Sign Out All Other Devices"
                >
                  Sign Out All Other Devices
                </button>
              )}
            </div>

            {otherSessions.length === 0 ? (
              <div className="no-other-devices">
                <span>🔒 No other devices are currently signed in.</span>
              </div>
            ) : (
              <div className="other-devices-list">
                {otherSessions.map((sess) => (
                  <div key={sess.id} className="other-device-row">
                    <span className="other-device-icon">
                      {DeviceSessionService.getDeviceIcon(sess.deviceName)}
                    </span>
                    <div className="other-device-details">
                      <span className="other-device-title">{sess.deviceName}</span>
                      <p className="other-device-sub">
                        {sess.browser} • {sess.approxLocation} • Last active {sess.lastActive}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-revoke"
                      onClick={() => {
                        terminateDeviceSession(sess.id);
                        setSessionNotice(`Signed out ${sess.deviceName}.`);
                        setTimeout(() => setSessionNotice(null), 3000);
                      }}
                      aria-label={`Sign out ${sess.deviceName}`}
                    >
                      Sign Out
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="device-security-note">
            <span className="shield-icon">🛡️</span>
            <p>
              <strong>Immediate Revocation:</strong> Signing out a device permanently revokes its session token and clears its browser encryption keys. That device will be forced back to the invite verification screen.
            </p>
          </div>
        </div>

        {/* Audit Trail Viewer */}
        <div className="settings-card full-width">
          <div className="settings-card-header">
            <h3>Location Permission Audit Trail</h3>
            <span className="audit-counter-badge">
              {locationAuditLog.length} Records Logged
            </span>
          </div>

          <p className="audit-sub-desc">
            Immutable log of all location sharing status changes and circle administrator accesses.
          </p>

          <div className="settings-audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {locationAuditLog.map((log) => (
                  <tr key={log.id}>
                    <td className="audit-time-cell">{log.timestamp}</td>
                    <td>
                      <Badge
                        label={log.action.replace('_', ' ')}
                        variant={
                          log.action.includes('granted')
                            ? 'success'
                            : log.action.includes('revoked') || log.action.includes('stopped')
                            ? 'warning'
                            : 'primary'
                        }
                        size="sm"
                      />
                    </td>
                    <td className="audit-user-cell">{log.userName}</td>
                    <td className="audit-details-cell">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Re-Authentication Modal */}
      {showReauthModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reauth-title">
          <div className="modal-box reauth-modal-box">
            <div className="modal-header">
              <h3 id="reauth-title">Confirm Device Revocation</h3>
              <button
                className="btn-close"
                onClick={() => {
                  setShowReauthModal(false);
                  setReauthPassword('');
                  setReauthError(null);
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmReauth} className="reauth-form">
              <p className="reauth-desc">
                For your security, please confirm your passcode to terminate all other authenticated sessions across your devices.
              </p>
              {reauthError && (
                <div className="reauth-error-alert" role="alert">
                  {reauthError}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="reauth-pass">Enter Account Password or PIN *</label>
                <input
                  id="reauth-pass"
                  type="password"
                  className="input-field"
                  placeholder="Enter passcode..."
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowReauthModal(false);
                    setReauthPassword('');
                    setReauthError(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-danger">
                  Confirm & Sign Out All Devices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
