import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DistanceService } from '../../services/distanceService';
import { RelationshipMilestone } from '../../types';

export const RelationshipView: React.FC = () => {
  const {
    currentUser,
    users,
    milestones,
    addMilestone,
    loveNotes,
    addLoveNote,
    toggleFavoriteNote,
  } = useApp();

  const [newNoteContent, setNewNoteContent] = useState('');
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneCategory, setMilestoneCategory] =
    useState<RelationshipMilestone['category']>('special');
  const [milestoneDesc, setMilestoneDesc] = useState('');
  const [touchState, setTouchState] = useState<'idle' | 'beating' | 'sent'>('idle');

  if (!currentUser) return null;

  const partnerId =
    currentUser.partnerId ||
    (currentUser.id === 'user-admin' ? 'user-girlfriend' : 'user-admin');
  const partner = users.find((u) => u.id === partnerId) || users[1];

  const daysInfo = DistanceService.calculateDaysTogether(
    currentUser.relationshipStartDate || '2024-02-14'
  );

  const nyTime = DistanceService.getCityTime('New York, USA');
  const parisTime = DistanceService.getCityTime('Paris, France');

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    addLoveNote(newNoteContent);
    setNewNoteContent('');
  };

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;

    let icon = '✨';
    if (milestoneCategory === 'trips') icon = '✈️';
    if (milestoneCategory === 'firsts') icon = '💖';
    if (milestoneCategory === 'anniversary') icon = '🥂';

    addMilestone(milestoneTitle, milestoneDate, milestoneCategory, milestoneDesc, icon);
    setMilestoneTitle('');
    setMilestoneDate('');
    setMilestoneDesc('');
    setShowMilestoneForm(false);
  };

  const handleSendHeartbeat = () => {
    setTouchState('beating');
    setTimeout(() => {
      setTouchState('sent');
      setTimeout(() => setTouchState('idle'), 2500);
    }, 1200);
  };

  return (
    <div className="view-container relationship-view">
      <div className="view-header-block">
        <div className="view-title-group">
          <h2>Relationship & Couple Hub</h2>
          <p className="view-description">
            Your private space dedicated to celebrating every milestone, anniversary, and shared memory with {partner?.name}.
          </p>
        </div>
      </div>

      {/* Hero Days Together & Dual Timezones */}
      <div className="relationship-hero-grid">
        {/* Days Together Counter Card */}
        <div className="rel-card days-counter-card">
          <div className="days-counter-header">
            <span className="heart-halo">❤️</span>
            <h3>Our Journey Together</h3>
          </div>
          <div className="days-number-display">
            <span className="big-number">{daysInfo.days}</span>
            <span className="big-label">Days</span>
          </div>
          <p className="days-breakdown">
            {daysInfo.hours} hours across {daysInfo.days} days of long-distance love.
          </p>
          <div className="anniversary-tag">
            <span>Started: February 14, 2024</span>
          </div>
        </div>

        {/* Dual Timezone Clocks */}
        <div className="rel-card dual-clock-card">
          <div className="clock-card-header">
            <span>🕰️</span>
            <h3>Time Difference</h3>
          </div>

          <div className="clocks-split-row">
            <div className="city-clock-box">
              <span className="city-clock-label">NEW YORK (ALEX)</span>
              <div className="city-clock-time">
                <span className="clock-digits">{nyTime.time}</span>
                <span className="clock-period">{nyTime.period}</span>
              </div>
              <span className="city-clock-status">
                {nyTime.isDaytime ? '☀️ Daytime' : '🌙 Night'}
              </span>
            </div>

            <div className="clock-vs-divider">
              <span>⇄</span>
              <span className="clock-diff-pill">+6 hrs</span>
            </div>

            <div className="city-clock-box">
              <span className="city-clock-label">PARIS (MAYA)</span>
              <div className="city-clock-time">
                <span className="clock-digits">{parisTime.time}</span>
                <span className="clock-period">{parisTime.period}</span>
              </div>
              <span className="city-clock-status">
                {parisTime.isDaytime ? '☀️ Daytime' : '🌙 Night'}
              </span>
            </div>
          </div>
        </div>

        {/* Heartbeat Touch Simulator */}
        <div className="rel-card heartbeat-card">
          <div className="heartbeat-header">
            <span>💓</span>
            <h3>Virtual Touch Heartbeat</h3>
          </div>
          <p className="heartbeat-sub">
            Tap the button to send a real-time virtual touch directly to {partner?.name}.
          </p>

          <div className="heartbeat-action-center">
            <button
              className={`heartbeat-btn ${touchState}`}
              onClick={handleSendHeartbeat}
              disabled={touchState !== 'idle'}
            >
              <span className="heartbeat-symbol">
                {touchState === 'beating' ? '💓' : touchState === 'sent' ? '❤️' : '🤍'}
              </span>
              <span className="heartbeat-btn-text">
                {touchState === 'beating'
                  ? 'Transmitting Touch...'
                  : touchState === 'sent'
                  ? 'Touch Felt by Partner!'
                  : 'Send Love Touch'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Milestones & Love Notes Section */}
      <div className="rel-dual-section-grid">
        {/* Milestone Scrapbook */}
        <div className="rel-panel milestones-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <span>✨</span>
              <h3>Milestone Scrapbook ({milestones.length})</h3>
            </div>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowMilestoneForm(!showMilestoneForm)}
            >
              {showMilestoneForm ? 'Cancel' : '+ New Milestone'}
            </button>
          </div>

          {showMilestoneForm && (
            <form onSubmit={handleCreateMilestone} className="milestone-add-form">
              <input
                type="text"
                placeholder="Milestone title (e.g. First trip together)"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                className="rel-input"
                required
              />
              <div className="form-row-2">
                <input
                  type="text"
                  placeholder="Date (e.g. July 20, 2026)"
                  value={milestoneDate}
                  onChange={(e) => setMilestoneDate(e.target.value)}
                  className="rel-input"
                />
                <select
                  value={milestoneCategory}
                  onChange={(e) =>
                    setMilestoneCategory(e.target.value as RelationshipMilestone['category'])
                  }
                  className="rel-input"
                >
                  <option value="special">Special Moment</option>
                  <option value="trips">Trip / Travel</option>
                  <option value="firsts">First Time</option>
                  <option value="anniversary">Anniversary</option>
                </select>
              </div>
              <textarea
                placeholder="A few words about this memory..."
                value={milestoneDesc}
                onChange={(e) => setMilestoneDesc(e.target.value)}
                className="rel-textarea"
                rows={2}
              />
              <button type="submit" className="btn-primary btn-sm">
                Add Milestone
              </button>
            </form>
          )}

          <div className="milestones-timeline">
            {milestones.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-icon-box">{item.icon}</div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-title">{item.title}</span>
                    <span className="timeline-date">{item.date}</span>
                  </div>
                  <p className="timeline-desc">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Private Love Notes */}
        <div className="rel-panel notes-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <span>💌</span>
              <h3>Private Love Notes ({loveNotes.length})</h3>
            </div>
          </div>

          {/* Write Note Form */}
          <form onSubmit={handleCreateNote} className="love-note-compose-form">
            <textarea
              placeholder={`Write a sweet private note for ${partner?.name}...`}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="rel-textarea"
              rows={2}
            />
            <div className="note-compose-footer">
              <span className="note-privacy-hint">🔒 Only visible to you and {partner?.name}</span>
              <button
                type="submit"
                className="btn-primary btn-sm"
                disabled={!newNoteContent.trim()}
              >
                Post Note
              </button>
            </div>
          </form>

          {/* Notes List */}
          <div className="love-notes-list">
            {loveNotes.map((note) => (
              <div key={note.id} className="love-note-bubble">
                <div className="love-note-top">
                  <span className="note-sender">
                    {note.authorName} {note.pinned && '📌'}
                  </span>
                  <div className="note-actions">
                    <button
                      className="note-fav-btn"
                      onClick={() => toggleFavoriteNote(note.id)}
                      title="Bookmark note"
                    >
                      {note.isFavorite ? '⭐' : '☆'}
                    </button>
                    <span className="note-timestamp">{note.createdAt}</span>
                  </div>
                </div>
                <p className="note-body">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
