import React from 'react';
import { useApp } from '../../context/AppContext';

export const CallModal: React.FC = () => {
  const {
    activeCall,
    acceptCall,
    endCall,
    toggleCallMute,
    toggleCallVideo,
  } = useApp();

  if (!activeCall) return null;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideo = activeCall.callType === 'video';

  return (
    <div className="call-overlay" role="dialog" aria-modal="true">
      <div className="call-card">
        {/* Prototype Disclaimer Banner */}
        <div className="call-prototype-badge">
          <span>⚠️ PROTOTYPE DEMO: Simulated Calling Interface (No hardware media stream)</span>
        </div>

        <div className="call-header-info">
          <div className="call-avatar-pulse">
            <div className="call-avatar">
              {activeCall.partnerName.charAt(0)}
            </div>
          </div>
          <h3 className="call-partner-name">{activeCall.partnerName}</h3>
          <span className="call-type-indicator">
            {isVideo ? '📹 Private Video Call' : '📞 Private Voice Call'}
          </span>
          <span className="call-status-label">
            {activeCall.status === 'outgoing' && 'Calling... (Ringing)'}
            {activeCall.status === 'incoming' && 'Incoming Call...'}
            {activeCall.status === 'connected' && `Connected • ${formatDuration(activeCall.durationSeconds)}`}
            {activeCall.status === 'ended' && 'Call Ended'}
          </span>
        </div>

        {/* Video simulation preview box if video call */}
        {isVideo && activeCall.status === 'connected' && (
          <div className="call-video-preview">
            <div className="video-placeholder-partner">
              {activeCall.isVideoOff ? (
                <div className="video-off-notice">
                  <span>📷 Camera is turned off</span>
                </div>
              ) : (
                <div className="video-mock-feed">
                  <span className="video-feed-name">{activeCall.partnerName}</span>
                  <div className="video-mock-visual">
                    <span className="visual-circle">👤</span>
                  </div>
                </div>
              )}
            </div>
            <div className="video-placeholder-self">
              <span>You</span>
            </div>
          </div>
        )}

        {/* Call Controls */}
        <div className="call-controls-container">
          {activeCall.status === 'outgoing' && (
            <div className="call-action-row">
              <button
                className="btn-call-action btn-call-accept"
                onClick={acceptCall}
                title="Simulate partner answering the call"
              >
                ✓ Simulate Answer
              </button>
              <button
                className="btn-call-action btn-call-decline"
                onClick={endCall}
                title="Cancel call"
              >
                ✕ Cancel Call
              </button>
            </div>
          )}

          {activeCall.status === 'incoming' && (
            <div className="call-action-row">
              <button
                className="btn-call-action btn-call-accept"
                onClick={acceptCall}
              >
                Accept
              </button>
              <button
                className="btn-call-action btn-call-decline"
                onClick={endCall}
              >
                Decline
              </button>
            </div>
          )}

          {activeCall.status === 'connected' && (
            <div className="call-connected-controls">
              <button
                className={`btn-control-circle ${activeCall.isMuted ? 'active-mute' : ''}`}
                onClick={toggleCallMute}
                title={activeCall.isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {activeCall.isMuted ? '🔇' : '🎙️'}
                <span className="btn-label">{activeCall.isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {isVideo && (
                <button
                  className={`btn-control-circle ${activeCall.isVideoOff ? 'active-video-off' : ''}`}
                  onClick={toggleCallVideo}
                  title={activeCall.isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {activeCall.isVideoOff ? '🚫' : '📹'}
                  <span className="btn-label">{activeCall.isVideoOff ? 'Camera On' : 'Camera Off'}</span>
                </button>
              )}

              <button
                className="btn-control-circle btn-end-call"
                onClick={endCall}
                title="End private call"
              >
                ☎️
                <span className="btn-label">End Call</span>
              </button>
            </div>
          )}

          {activeCall.status === 'ended' && (
            <div className="call-ended-notice">
              <span>Closing call window...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
