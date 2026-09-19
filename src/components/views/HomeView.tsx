import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DistanceService } from '../../services/distanceService';
import { Badge } from '../common/Badge';

export const HomeView: React.FC = () => {
  const {
    currentUser,
    users,
    setCurrentView,
    setActiveConversationId,
    startCall,
    milestones,
    memories,
    loveNotes,
  } = useApp();

  const [touchSent, setTouchSent] = useState(false);

  if (!currentUser) return null;

  // Find partner (Maya if user is Alex, Alex if user is Maya, or default first other)
  const partnerId =
    currentUser.partnerId ||
    (currentUser.id === 'user-admin' ? 'user-girlfriend' : 'user-admin');
  const partner = users.find((u) => u.id === partnerId) || users[1];

  const partnerCity = partner?.locationSettings?.coordinates?.city || 'Paris, France';
  const myCity = currentUser?.locationSettings?.coordinates?.city || 'New York, USA';

  const partnerTime = DistanceService.getCityTime(partnerCity);
  const myTime = DistanceService.getCityTime(myCity);

  // Distance calculation if both enabled
  const bothEnabled =
    currentUser.locationSettings?.enabled && partner?.locationSettings?.enabled;
  const distanceInfo =
    bothEnabled &&
    currentUser.locationSettings?.coordinates &&
    partner.locationSettings?.coordinates
      ? DistanceService.calculateDistance(
          currentUser.locationSettings.coordinates,
          partner.locationSettings.coordinates
        )
      : null;

  // Days together
  const daysInfo = DistanceService.calculateDaysTogether(
    currentUser.relationshipStartDate || '2024-02-14'
  );

  const handleSendTouch = () => {
    setTouchSent(true);
    setTimeout(() => setTouchSent(false), 2500);
  };

  const handleOpenPartnerChat = () => {
    setActiveConversationId('conv-alex-maya');
    setCurrentView('chat');
  };

  const latestMemory = memories[0];

  return (
    <div className="view-container home-view">
      {/* Welcome Banner */}
      <section className="home-hero-card">
        <div className="hero-couple-badge">
          <span className="heart-icon">❤️</span>
          <span>Private Long-Distance Sanctuary</span>
        </div>

        <div className="hero-main-row">
          <div className="hero-partner-info">
            <div className="hero-avatar-pair">
              <div
                className="hero-avatar my-avatar"
                style={{ backgroundColor: currentUser.avatarBg }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="hero-avatar-connector">
                <span>⇄</span>
              </div>
              <div
                className="hero-avatar partner-avatar"
                style={{ backgroundColor: partner?.avatarBg || '#ec4899' }}
              >
                {partner?.name.charAt(0) || 'M'}
              </div>
            </div>

            <div className="hero-text-block">
              <h2 className="hero-title">
                Connected with {partner?.name}
              </h2>
              <p className="hero-subtitle">
                {bothEnabled && distanceInfo
                  ? `${distanceInfo.formattedKm} km apart (${myCity.split(',')[0]} ⇄ ${partnerCity.split(',')[0]})`
                  : 'Long distance connection active'}
              </p>
            </div>
          </div>

          <div className="hero-quick-actions">
            <button
              className="btn-hero btn-chat"
              onClick={handleOpenPartnerChat}
              title="Open Chat"
            >
              💬 Open Chat
            </button>
            <button
              className="btn-hero btn-call"
              onClick={() =>
                startCall('conv-alex-maya', partner.id, partner.name, 'video')
              }
              title="Start Video Call"
            >
              📹 Video Call
            </button>
          </div>
        </div>

        {/* Live Status Bar */}
        <div className="hero-stats-grid">
          <div className="hero-stat-card">
            <span className="stat-label">DAYS TOGETHER</span>
            <div className="stat-value-group">
              <span className="stat-value">{daysInfo.days}</span>
              <span className="stat-unit">Days</span>
            </div>
            <span className="stat-sub">Since February 14, 2024</span>
          </div>

          <div className="hero-stat-card">
            <span className="stat-label">{partner?.name.toUpperCase()}'S TIME</span>
            <div className="stat-value-group">
              <span className="stat-value">{partnerTime.time}</span>
              <span className="stat-unit">{partnerTime.period}</span>
            </div>
            <span className="stat-sub">
              {partnerTime.isDaytime ? '☀️ Daytime in Paris' : '🌙 Night in Paris'}
            </span>
          </div>

          <div className="hero-stat-card">
            <span className="stat-label">YOUR LOCAL TIME</span>
            <div className="stat-value-group">
              <span className="stat-value">{myTime.time}</span>
              <span className="stat-unit">{myTime.period}</span>
            </div>
            <span className="stat-sub">{myCity.split(',')[0]}</span>
          </div>

          <div className="hero-stat-card touch-card">
            <span className="stat-label">VIRTUAL TOUCH</span>
            <button
              className={`btn-touch-pulse ${touchSent ? 'sent' : ''}`}
              onClick={handleSendTouch}
            >
              {touchSent ? '❤️ Touch Sent!' : '💓 Send Heartbeat'}
            </button>
            <span className="stat-sub">Instant gentle vibration</span>
          </div>
        </div>
      </section>

      {/* Grid: Latest Note & Recent Memory */}
      <div className="home-dashboard-grid">
        {/* Latest Love Note */}
        <div className="dashboard-widget love-note-widget">
          <div className="widget-header">
            <div className="widget-title-row">
              <span className="widget-icon">💌</span>
              <h3>Latest Private Note</h3>
            </div>
            <button
              className="btn-link"
              onClick={() => setCurrentView('relationship')}
            >
              View all notes →
            </button>
          </div>

          {loveNotes.length > 0 ? (
            <div className="note-card-preview">
              <p className="note-text">"{loveNotes[0].content}"</p>
              <div className="note-meta">
                <span className="note-author">— {loveNotes[0].authorName}</span>
                <span className="note-time">{loveNotes[0].createdAt}</span>
              </div>
            </div>
          ) : (
            <p className="empty-text">No notes yet. Leave a sweet message in Relationship Hub!</p>
          )}
        </div>

        {/* Latest Shared Memory */}
        <div className="dashboard-widget memory-widget">
          <div className="widget-header">
            <div className="widget-title-row">
              <span className="widget-icon">📸</span>
              <h3>Recent Memory Vault</h3>
            </div>
            <button
              className="btn-link"
              onClick={() => setCurrentView('memories')}
            >
              Open Gallery →
            </button>
          </div>

          {latestMemory ? (
            <div
              className="memory-card-preview"
              onClick={() => setCurrentView('memories')}
            >
              <img
                src={latestMemory.url}
                alt={latestMemory.caption}
                className="memory-preview-img"
              />
              <div className="memory-overlay-info">
                <span className="memory-caption">{latestMemory.caption}</span>
                <span className="memory-date">{latestMemory.date}</span>
              </div>
            </div>
          ) : (
            <p className="empty-text">Share photos and short videos in your chat to build your vault.</p>
          )}
        </div>

        {/* Relationship Milestone Highlight */}
        <div className="dashboard-widget milestone-widget">
          <div className="widget-header">
            <div className="widget-title-row">
              <span className="widget-icon">✨</span>
              <h3>Special Milestones</h3>
            </div>
            <button
              className="btn-link"
              onClick={() => setCurrentView('relationship')}
            >
              Scrapbook →
            </button>
          </div>

          <div className="milestones-mini-list">
            {milestones.slice(0, 2).map((m) => (
              <div key={m.id} className="milestone-mini-item">
                <span className="milestone-mini-icon">{m.icon}</span>
                <div className="milestone-mini-body">
                  <span className="milestone-mini-title">{m.title}</span>
                  <span className="milestone-mini-date">{m.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inner Circle Status */}
        <div className="dashboard-widget circle-widget">
          <div className="widget-header">
            <div className="widget-title-row">
              <span className="widget-icon">👥</span>
              <h3>Our Inner Circle</h3>
            </div>
            <button
              className="btn-link"
              onClick={() => {
                setActiveConversationId('conv-group-inner-circle');
                setCurrentView('chat');
              }}
            >
              Open Circle →
            </button>
          </div>

          <div className="circle-members-avatars">
            {users.map((u) => (
              <div
                key={u.id}
                className="circle-user-pill"
                title={`${u.name} (${u.role})`}
              >
                <div
                  className="circle-pill-avatar"
                  style={{ backgroundColor: u.avatarBg }}
                >
                  {u.name.charAt(0)}
                </div>
                <span className="circle-pill-name">{u.name}</span>
                {u.id === partnerId && <span className="partner-heart-dot">❤️</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
