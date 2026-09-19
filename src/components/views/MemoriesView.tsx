import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MemoryItem } from '../../types';

type AlbumFilter = 'All' | 'Paris Moments' | 'Trips & Dates' | 'Favorites';
type ViewMode = 'timeline' | 'grid';

export const MemoriesView: React.FC = () => {
  const {
    memories,
    addMemory,
    deleteMemory,
    toggleMemoryReaction,
    addMemoryComment,
    currentUser,
    users,
  } = useApp();

  const [activeAlbum, setActiveAlbum] = useState<AlbumFilter>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formMediaType, setFormMediaType] = useState<'image' | 'video'>('image');
  const [formUrl, setFormUrl] = useState('');
  const [formAlbum, setFormAlbum] = useState<MemoryItem['album']>('Paris Moments');
  const [formLocation, setFormLocation] = useState('');
  const [formDuration, setFormDuration] = useState<number>(15);
  const [formVisibility, setFormVisibility] = useState<MemoryItem['visibility']>('partner');
  const [formTaggedPeople, setFormTaggedPeople] = useState<string[]>(['Alex', 'Maya']);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // New Comment Input in Lightbox
  const [commentInput, setCommentInput] = useState('');

  if (!currentUser) return null;

  // Filter memories by album and search query
  const filteredMemories = useMemo(() => {
    return memories.filter((item) => {
      if (activeAlbum !== 'All' && item.album !== activeAlbum) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchCaption = item.caption.toLowerCase().includes(q);
        const matchLocation = item.locationLabel?.toLowerCase().includes(q);
        const matchUploader = item.uploaderName.toLowerCase().includes(q);
        if (!matchTitle && !matchCaption && !matchLocation && !matchUploader) return false;
      }
      return true;
    });
  }, [memories, activeAlbum, searchQuery]);

  // Group memories by Month / Period for Timeline View
  const timelineGroups = useMemo(() => {
    const groups: Record<string, MemoryItem[]> = {};

    filteredMemories.forEach((mem) => {
      // Extract period string like "September 2026", "August 2026", or use "Recent"
      let groupKey = 'Recent Moments';
      if (mem.date.includes('2026')) {
        const parts = mem.date.split(',');
        if (parts[0]) {
          const monthPart = parts[0].trim().split(' ')[0];
          groupKey = `${monthPart} 2026`;
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(mem);
    });

    return groups;
  }, [filteredMemories]);

  // Keep selectedMemory fresh if state updates
  const activeSelectedMemory = selectedMemory
    ? memories.find((m) => m.id === selectedMemory.id) || selectedMemory
    : null;

  const handleOpenUploadModal = () => {
    setFormTitle('');
    setFormCaption('');
    setFormMediaType('image');
    setFormUrl('');
    setFormAlbum('Paris Moments');
    setFormLocation('Montmartre, Paris');
    setFormDuration(15);
    setFormVisibility('partner');
    setFormTaggedPeople(['Alex', 'Maya']);
    setUploadProgress(null);
    setUploadError(null);
    setShowUploadModal(true);
  };

  const handleTagToggle = (personName: string) => {
    setFormTaggedPeople((prev) =>
      prev.includes(personName) ? prev.filter((p) => p !== personName) : [...prev, personName]
    );
  };

  const handleStartUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCaption.trim() && !formTitle.trim()) {
      setUploadError('Please provide a title or caption for this memory.');
      return;
    }

    // Video duration limit enforcement: Videos must be under 60 seconds
    if (formMediaType === 'video' && formDuration > 60) {
      setUploadError('Videos in PrivateCircle must be 60 seconds or shorter.');
      return;
    }

    setUploadError(null);
    setUploadProgress(15);

    // Simulate reliable upload with progress stages
    const step1 = setTimeout(() => setUploadProgress(45), 300);
    const step2 = setTimeout(() => setUploadProgress(85), 600);
    const step3 = setTimeout(() => {
      setUploadProgress(100);

      const defaultImageUrl =
        formMediaType === 'image'
          ? formUrl.trim() ||
            'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80'
          : formUrl.trim() ||
            'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-couple-holding-each-other-41617-large.mp4';

      addMemory({
        type: formMediaType,
        url: defaultImageUrl,
        title: formTitle.trim() || 'Private Memory',
        caption: formCaption.trim() || formTitle.trim() || 'Shared moments',
        locationLabel: formLocation.trim() || undefined,
        peopleIncluded: formTaggedPeople.length > 0 ? formTaggedPeople : undefined,
        visibility: formVisibility,
        uploadedBy: currentUser.id,
        uploaderName: currentUser.name,
        album: formAlbum,
        durationSeconds: formMediaType === 'video' ? formDuration : undefined,
        reactions: {},
        comments: [],
      });

      setTimeout(() => {
        setUploadProgress(null);
        setShowUploadModal(false);
      }, 300);
    }, 900);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeSelectedMemory) return;
    addMemoryComment(activeSelectedMemory.id, commentInput);
    setCommentInput('');
  };

  const emojisList = ['❤️', '🥰', '✨', '🔥', '🥺'];

  return (
    <div className="view-container memories-view">
      {/* Header Bar */}
      <div className="view-header-block">
        <div className="view-title-group">
          <div className="memories-title-badge">
            <span className="vault-icon">📸</span>
            <h2>Shared Memories & Media Vault</h2>
          </div>
          <p className="view-description">
            A private chronological milestone trail and media archive (&lt;60s video limit) strictly for your inner circle.
          </p>
        </div>

        <div className="memories-header-actions">
          {/* Mode Switcher */}
          <div className="view-mode-toggle" role="group" aria-label="View Mode">
            <button
              className={`mode-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
              aria-label="Timeline View"
            >
              📅 Timeline
            </button>
            <button
              className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
            >
              ⊞ Grid
            </button>
          </div>

          <button
            className="btn-primary add-memory-btn"
            onClick={handleOpenUploadModal}
            aria-label="Add Memory to Vault"
          >
            ➕ Add Memory
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Notice */}
      <div className="memories-privacy-banner">
        <span className="shield-icon">🛡️</span>
        <div>
          <strong>Privacy Assured:</strong> Media is encrypted in transit and stored with explicit manual location labels only. No EXIF scraping or background location metadata is extracted.
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="album-filters-bar">
        <div className="album-tabs-group">
          {(['All', 'Paris Moments', 'Trips & Dates', 'Favorites'] as AlbumFilter[]).map(
            (album) => (
              <button
                key={album}
                className={`album-tab-btn ${activeAlbum === album ? 'active' : ''}`}
                onClick={() => setActiveAlbum(album)}
                aria-label={`Filter album ${album}`}
              >
                {album}
                <span className="album-count">
                  {album === 'All'
                    ? memories.length
                    : memories.filter((m) => m.album === album).length}
                </span>
              </button>
            )
          )}
        </div>

        <input
          type="text"
          className="memory-search-input"
          placeholder="Search by title, location, or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search memories"
        />
      </div>

      {/* Empty State */}
      {filteredMemories.length === 0 && (
        <div className="empty-gallery">
          <span className="empty-gallery-icon">📸</span>
          <h3>No media matching your selection</h3>
          <p>Photos and videos you post or upload appear here in your private timeline.</p>
          <button className="btn-primary btn-sm" onClick={handleOpenUploadModal}>
            Upload Memory
          </button>
        </div>
      )}

      {/* MODE 1: TIMELINE VIEW */}
      {viewMode === 'timeline' && filteredMemories.length > 0 && (
        <div className="memory-timeline-container" aria-label="Memory Timeline">
          {Object.entries(timelineGroups).map(([period, items]) => (
            <div key={period} className="timeline-period-block">
              <div className="timeline-period-header">
                <span className="period-pin">📌</span>
                <h3 className="period-title">{period}</h3>
                <span className="period-count">{items.length} {items.length === 1 ? 'memory' : 'memories'}</span>
              </div>

              <div className="timeline-trail">
                {items.map((item) => {
                  const isOwner = item.uploadedBy === currentUser.id;
                  const totalComments = item.comments?.length || 0;

                  return (
                    <article key={item.id} className="timeline-card">
                      <div className="timeline-marker" />

                      <div className="timeline-card-content">
                        {/* Header metadata */}
                        <div className="timeline-card-header">
                          <div className="timeline-author-info">
                            <span className="timeline-author-name">{item.uploaderName}</span>
                            <span className="timeline-date">• {item.date}</span>
                            {item.locationLabel && (
                              <span className="timeline-location-badge">
                                📍 {item.locationLabel}
                              </span>
                            )}
                          </div>

                          <div className="timeline-tags-row">
                            <span className="timeline-album-tag">{item.album}</span>
                            <span className="timeline-visibility-tag">
                              {item.visibility === 'partner' && '❤️ Partner Only'}
                              {item.visibility === 'circle' && '👥 Circle'}
                              {item.visibility === 'private' && '🔒 Private'}
                            </span>
                          </div>
                        </div>

                        {/* Title & Caption */}
                        {item.title && <h4 className="timeline-card-title">{item.title}</h4>}
                        <p className="timeline-card-caption">{item.caption}</p>

                        {/* Media Visual Frame */}
                        <div
                          className="timeline-media-frame"
                          onClick={() => setSelectedMemory(item)}
                          role="button"
                          tabIndex={0}
                          aria-label={`View ${item.title || item.caption}`}
                        >
                          {item.type === 'image' ? (
                            <img
                              src={item.url}
                              alt={item.caption}
                              className="timeline-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="video-thumb-container">
                              <video src={item.url} className="timeline-video-preview" />
                              <span className="video-play-indicator">▶</span>
                              {item.durationSeconds && (
                                <span className="video-duration-pill">{item.durationSeconds}s</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* People Tagged */}
                        {item.peopleIncluded && item.peopleIncluded.length > 0 && (
                          <div className="timeline-people-row">
                            <span className="with-label">With:</span>
                            {item.peopleIncluded.map((person) => (
                              <span key={person} className="person-pill">
                                👤 {person}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Interactive Reactions & Comment Row */}
                        <div className="timeline-card-footer">
                          <div className="reactions-cluster">
                            {emojisList.map((emoji) => {
                              const reactors = item.reactions?.[emoji] || [];
                              const hasReacted = reactors.includes(currentUser.id);
                              return (
                                <button
                                  key={emoji}
                                  className={`btn-reaction ${hasReacted ? 'active' : ''}`}
                                  onClick={() => toggleMemoryReaction(item.id, emoji)}
                                  aria-label={`React with ${emoji}`}
                                >
                                  <span>{emoji}</span>
                                  {reactors.length > 0 && (
                                    <span className="reaction-num">{reactors.length}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <div className="timeline-footer-actions">
                            <button
                              className="btn-link btn-sm comment-count-btn"
                              onClick={() => setSelectedMemory(item)}
                            >
                              💬 {totalComments} {totalComments === 1 ? 'Note' : 'Notes'}
                            </button>
                            {isOwner && (
                              <button
                                className="btn-link btn-danger btn-sm"
                                onClick={() => {
                                  if (window.confirm('Delete this memory from the Vault?')) {
                                    deleteMemory(item.id);
                                  }
                                }}
                                aria-label="Delete memory"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODE 2: GRID VIEW */}
      {viewMode === 'grid' && filteredMemories.length > 0 && (
        <div className="memories-grid" aria-label="Memories Grid">
          {filteredMemories.map((item) => (
            <div
              key={item.id}
              className="memory-grid-item"
              onClick={() => setSelectedMemory(item)}
              role="button"
              tabIndex={0}
              aria-label={item.title || item.caption}
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.caption}
                  className="memory-grid-thumb"
                  loading="lazy"
                />
              ) : (
                <div className="video-thumb-container">
                  <video src={item.url} className="memory-grid-thumb" />
                  <span className="video-play-indicator">▶</span>
                  {item.durationSeconds && (
                    <span className="video-duration-pill">{item.durationSeconds}s</span>
                  )}
                </div>
              )}

              <div className="memory-grid-overlay">
                <span className="grid-overlay-caption">{item.title || item.caption}</span>
                <span className="grid-overlay-date">{item.locationLabel || item.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL LIGHTBOX MODAL WITH NOTES & REACTIONS */}
      {activeSelectedMemory && (
        <div className="lightbox-backdrop" onClick={() => setSelectedMemory(null)} role="dialog" aria-modal="true">
          <div className="lightbox-content upgraded-lightbox" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close-btn"
              onClick={() => setSelectedMemory(null)}
              aria-label="Close media preview"
            >
              ✕
            </button>

            {/* Media Area */}
            <div className="lightbox-media-wrapper">
              {activeSelectedMemory.type === 'image' ? (
                <img
                  src={activeSelectedMemory.url}
                  alt={activeSelectedMemory.caption}
                  className="lightbox-full-img"
                />
              ) : (
                <video
                  src={activeSelectedMemory.url}
                  controls
                  autoPlay
                  className="lightbox-full-video"
                />
              )}
            </div>

            {/* Sidebar / Bottom Info Panel */}
            <div className="lightbox-sidebar">
              <div className="lightbox-header-info">
                <h3>{activeSelectedMemory.title || activeSelectedMemory.caption}</h3>
                <p className="lightbox-meta-sub">
                  Shared by <strong>{activeSelectedMemory.uploaderName}</strong> • {activeSelectedMemory.date}
                </p>
                {activeSelectedMemory.locationLabel && (
                  <p className="lightbox-location-tag">
                    📍 {activeSelectedMemory.locationLabel}
                  </p>
                )}
                {activeSelectedMemory.title && (
                  <p className="lightbox-caption-text">{activeSelectedMemory.caption}</p>
                )}
              </div>

              {/* Reactions cluster */}
              <div className="lightbox-reactions-block">
                <span className="block-label">Reactions:</span>
                <div className="reactions-cluster">
                  {emojisList.map((emoji) => {
                    const reactors = activeSelectedMemory.reactions?.[emoji] || [];
                    const hasReacted = reactors.includes(currentUser.id);
                    return (
                      <button
                        key={emoji}
                        className={`btn-reaction ${hasReacted ? 'active' : ''}`}
                        onClick={() => toggleMemoryReaction(activeSelectedMemory.id, emoji)}
                      >
                        <span>{emoji}</span>
                        {reactors.length > 0 && (
                          <span className="reaction-num">{reactors.length}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sweet Notes & Comments List */}
              <div className="lightbox-comments-block">
                <span className="block-label">
                  Sweet Notes & Comments ({activeSelectedMemory.comments?.length || 0})
                </span>

                <div className="comments-scroll-list">
                  {!activeSelectedMemory.comments || activeSelectedMemory.comments.length === 0 ? (
                    <div className="no-comments-msg">
                      <span>No sweet notes yet. Leave one below! ❤️</span>
                    </div>
                  ) : (
                    activeSelectedMemory.comments.map((c) => (
                      <div key={c.id} className="comment-bubble">
                        <div className="comment-header">
                          <span className="comment-author">{c.authorName}</span>
                          <span className="comment-time">{c.timestamp}</span>
                        </div>
                        <p className="comment-text">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="comment-input-form">
                  <input
                    type="text"
                    className="input-field comment-input"
                    placeholder="Leave a sweet memory note..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                  />
                  <button type="submit" className="btn-primary btn-sm">
                    Post
                  </button>
                </form>
              </div>

              <div className="lightbox-bottom-actions">
                <a
                  href={activeSelectedMemory.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="btn-secondary btn-sm"
                >
                  💾 Save Media
                </a>
                {activeSelectedMemory.uploadedBy === currentUser.id && (
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => {
                      if (window.confirm('Delete this memory from the Vault?')) {
                        deleteMemory(activeSelectedMemory.id);
                        setSelectedMemory(null);
                      }
                    }}
                  >
                    Delete Memory
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MEMORY MODAL */}
      {showUploadModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title">
          <div className="modal-box memory-upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="upload-title">Add Memory to Vault</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowUploadModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="upload-form">
              {uploadError && (
                <div className="upload-error-alert" role="alert">
                  <span>⚠️ {uploadError}</span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="mem-title">Memory Title *</label>
                  <input
                    id="mem-title"
                    type="text"
                    placeholder="e.g. Paris Sunset from Montmartre"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="mem-type">Media Type</label>
                  <select
                    id="mem-type"
                    value={formMediaType}
                    onChange={(e) => setFormMediaType(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="image">📷 Photo</option>
                    <option value="video">🎥 Video (&lt;60s)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="mem-caption">Story / Notes</label>
                <textarea
                  id="mem-caption"
                  rows={2}
                  placeholder="Capture the memory, atmosphere, feeling, or sweet thoughts..."
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="mem-album">Target Album</label>
                  <select
                    id="mem-album"
                    value={formAlbum}
                    onChange={(e) => setFormAlbum(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="Paris Moments">Paris Moments</option>
                    <option value="Trips & Dates">Trips & Dates</option>
                    <option value="Favorites">Favorites</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="mem-location">Manual Location Tag (Optional)</label>
                  <input
                    id="mem-location"
                    type="text"
                    placeholder="e.g. Montmartre, Paris"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {formMediaType === 'video' && (
                <div className="form-group video-duration-row">
                  <label htmlFor="mem-duration">
                    Video Duration (seconds, max 60s) *
                  </label>
                  <input
                    id="mem-duration"
                    type="number"
                    min={1}
                    value={formDuration}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormDuration(val);
                      if (val > 60) {
                        setUploadError('Videos in PrivateCircle must be 60 seconds or shorter.');
                      } else {
                        setUploadError(null);
                      }
                    }}
                    className="input-field"
                  />
                  <span className="field-hint">
                    PrivateCircle strictly limits videos to under 60 seconds to maintain intimacy and optimize storage.
                  </span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="mem-visibility">Audience Visibility</label>
                  <select
                    id="mem-visibility"
                    value={formVisibility}
                    onChange={(e) => setFormVisibility(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="partner">❤️ Partner Only</option>
                    <option value="circle">👥 Whole Circle (Trusted Friends)</option>
                    <option value="private">🔒 Private (Only Me)</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Tagged Friends</label>
                  <div className="tags-checkboxes">
                    {['Alex', 'Maya', 'Sam', 'Jordan'].map((person) => (
                      <label key={person} className="tag-checkbox-item">
                        <input
                          type="checkbox"
                          checked={formTaggedPeople.includes(person)}
                          onChange={() => handleTagToggle(person)}
                        />
                        <span>{person}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Bar (Simulated Upload) */}
              {uploadProgress !== null && (
                <div className="upload-progress-container">
                  <div className="progress-labels">
                    <span>Uploading memory securely...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadProgress !== null}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={uploadProgress !== null}
                >
                  {uploadProgress !== null ? 'Uploading...' : 'Save to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
