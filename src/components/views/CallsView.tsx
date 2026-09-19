import React from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

export const CallsView: React.FC = () => {
  const { callLogs, users, currentUser, startCall } = useApp();

  if (!currentUser) return null;

  const partnerId =
    currentUser.partnerId ||
    (currentUser.id === 'user-admin' ? 'user-girlfriend' : 'user-admin');
  const partner = users.find((u) => u.id === partnerId) || users[1];

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return 'Missed';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="view-container calls-view">
      <div className="view-header-block">
        <div className="view-title-group">
          <h2>Private Voice & Video Calls</h2>
          <p className="view-description">
            Encrypted, direct calling interface for you, your partner, and trusted circle.
          </p>
        </div>
      </div>

      {/* Quick Call Hero Card */}
      <div className="quick-call-card">
        <div className="quick-call-partner-info">
          <div
            className="partner-call-avatar"
            style={{ backgroundColor: partner?.avatarBg || '#ec4899' }}
          >
            {partner?.name.charAt(0)}
          </div>
          <div>
            <h3>Call {partner?.name}</h3>
            <p className="call-partner-meta">
              Partner • Paris, France • Online in PrivateCircle
            </p>
          </div>
        </div>

        <div className="quick-call-btn-group">
          <button
            className="btn-call-action btn-voice-call"
            onClick={() =>
              startCall('conv-alex-maya', partner.id, partner.name, 'voice')
            }
          >
            <span>📞</span>
            <span>Start Voice Call</span>
          </button>
          <button
            className="btn-call-action btn-video-call"
            onClick={() =>
              startCall('conv-alex-maya', partner.id, partner.name, 'video')
            }
          >
            <span>📹</span>
            <span>Start Video Call</span>
          </button>
        </div>
      </div>

      {/* Call History Section */}
      <div className="call-history-section">
        <div className="section-header">
          <h3>Recent Call History ({callLogs.length})</h3>
        </div>

        {callLogs.length === 0 ? (
          <div className="empty-call-logs">
            <p>No previous calls logged. Start a call above!</p>
          </div>
        ) : (
          <div className="call-log-list">
            {callLogs.map((log) => {
              const isMissed = log.status === 'missed';
              const isVideo = log.callType === 'video';

              return (
                <div key={log.id} className="call-log-row">
                  <div className="call-log-icon-box">
                    <span className="log-type-symbol">
                      {isVideo ? '📹' : '📞'}
                    </span>
                    <span
                      className={`log-direction-arrow ${log.direction} ${isMissed ? 'missed' : ''}`}
                    >
                      {log.direction === 'outgoing' ? '↗' : '↙'}
                    </span>
                  </div>

                  <div className="call-log-body">
                    <div className="call-log-name-row">
                      <span className="call-log-name">{log.partnerName}</span>
                      <Badge
                        label={isMissed ? 'Missed' : formatDuration(log.durationSeconds)}
                        variant={isMissed ? 'danger' : 'neutral'}
                        size="sm"
                      />
                    </div>
                    <span className="call-log-time">
                      {log.timestamp} • {isVideo ? 'Video' : 'Voice'} Call
                    </span>
                  </div>

                  <div className="call-log-action">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() =>
                        startCall('conv-alex-maya', log.partnerId, log.partnerName, log.callType)
                      }
                      title={`Call back ${log.partnerName}`}
                    >
                      Call back
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Technical Architecture Note */}
      <div className="call-architecture-banner">
        <span className="tech-badge">PROTOTYPE NOTICE</span>
        <p>
          This is an interactive simulation of the PrivateCircle calling engine. When moving to real production, this module directly integrates with WebRTC peer connections and media streaming.
        </p>
      </div>
    </div>
  );
};
