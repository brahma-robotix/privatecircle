import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import {
  calculateDaysRemaining,
  canUserViewCalendarEvent,
  getCategoryDetails,
  formatCalendarDisplayDate,
} from '../../services/calendarService';

export const CalendarView: React.FC = () => {
  const {
    currentUser,
    users,
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'countdowns' | 'calendar' | 'list'>('countdowns');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar Month State (Defaults to September 2026 for prototype)
  const [viewDate, setViewDate] = useState<Date>(new Date(2026, 8, 1)); // Sep 2026
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; events: CalendarEvent[] } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarEvent['category']>('travel');
  const [formVisibility, setFormVisibility] = useState<CalendarEvent['visibility']>('partner');
  const [formReminder, setFormReminder] = useState<CalendarEvent['reminder']>('1day');
  const [formIsCountdown, setFormIsCountdown] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!currentUser) return null;

  const partnerId =
    currentUser.partnerId ||
    (currentUser.id === 'user-admin' ? 'user-girlfriend' : 'user-admin');

  // Filter events visible to the current user
  const visibleEvents = useMemo(() => {
    return calendarEvents.filter((evt) =>
      canUserViewCalendarEvent(evt, currentUser.id, partnerId)
    );
  }, [calendarEvents, currentUser.id, partnerId]);

  // Apply category & query filter
  const filteredEvents = useMemo(() => {
    return visibleEvents.filter((evt) => {
      if (selectedCategory !== 'all' && evt.category !== selectedCategory) return false;
      if (
        searchQuery &&
        !evt.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !evt.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [visibleEvents, selectedCategory, searchQuery]);

  // Countdowns sorted by date
  const countdownEvents = useMemo(() => {
    return visibleEvents
      .filter((evt) => evt.isCountdown)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [visibleEvents]);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleOpenAddModal = (defaultDate?: string) => {
    setEditingEventId(null);
    setFormTitle('');
    setFormDate(defaultDate || '2026-09-28');
    setFormTime('12:00');
    setFormCategory('travel');
    setFormVisibility('partner');
    setFormReminder('1day');
    setFormIsCountdown(true);
    setFormDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setFormTitle(evt.title);
    setFormDate(evt.date);
    setFormTime(evt.time || '');
    setFormCategory(evt.category);
    setFormVisibility(evt.visibility);
    setFormReminder(evt.reminder);
    setFormIsCountdown(evt.isCountdown || false);
    setFormDescription(evt.description);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    if (editingEventId) {
      updateCalendarEvent(editingEventId, {
        title: formTitle.trim(),
        date: formDate,
        time: formTime,
        category: formCategory,
        visibility: formVisibility,
        reminder: formReminder,
        isCountdown: formIsCountdown,
        description: formDescription.trim(),
      });
      showNotification('Updated calendar event.');
    } else {
      addCalendarEvent({
        title: formTitle.trim(),
        date: formDate,
        time: formTime,
        category: formCategory,
        visibility: formVisibility,
        reminder: formReminder,
        isCountdown: formIsCountdown,
        description: formDescription.trim(),
      });
      showNotification('Added new calendar event.');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteCalendarEvent(id);
      showNotification('Event removed.');
      if (selectedDayEvents) {
        setSelectedDayEvents((prev) =>
          prev ? { ...prev, events: prev.events.filter((e) => e.id !== id) } : null
        );
      }
    }
  };

  // Calendar Grid calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const getEventsForDay = (dayNum: number) => {
    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    return visibleEvents.filter((evt) => evt.date === dateStr);
  };

  return (
    <div className="calendar-view-container">
      {/* Top Banner Status */}
      {statusMessage && (
        <div className="status-toast" role="status">
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="calendar-header-bar">
        <div>
          <div className="calendar-title-badge">
            <span className="cal-icon">📅</span>
            <h2>Shared Calendar & Countdowns</h2>
          </div>
          <p className="calendar-subtitle">
            Track flights, visits, anniversaries, exams, and milestones in one private space.
          </p>
        </div>

        <div className="calendar-header-actions">
          <button
            className="btn-primary add-event-btn"
            onClick={() => handleOpenAddModal()}
            aria-label="Add Calendar Event"
          >
            + Add Event
          </button>
        </div>
      </header>

      {/* Privacy Notice Banner */}
      <div className="calendar-privacy-banner">
        <span className="shield-icon">🛡️</span>
        <div>
          <strong>Strict Privacy & No GPS Tracking:</strong> Flights, trips, and milestones are saved purely as manual entries with your selected audience. Background location tracking is never triggered.
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="calendar-tab-bar">
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'countdowns' ? 'active' : ''}`}
            onClick={() => setActiveTab('countdowns')}
            aria-label="Countdowns Tab"
          >
            ⏳ Countdowns ({countdownEvents.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
            aria-label="Month View Tab"
          >
            📆 Month Grid
          </button>
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
            aria-label="All Events Tab"
          >
            📋 All Events ({visibleEvents.length})
          </button>
        </div>

        {/* Filters */}
        <div className="calendar-filter-bar">
          <select
            className="category-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter events by category"
          >
            <option value="all">All Categories</option>
            <option value="travel">✈️ Flights & Travel</option>
            <option value="birthday">🎂 Birthdays</option>
            <option value="anniversary">❤️ Anniversaries</option>
            <option value="exam">📚 Exams & Study</option>
            <option value="meeting">👥 Circle Gatherings</option>
            <option value="reminder">🔔 Reminders</option>
            <option value="custom">⭐ Special</option>
          </select>

          <input
            type="text"
            className="calendar-search-input"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search events"
          />
        </div>
      </div>

      {/* TAB 1: COUNTDOWNS HERO VIEW */}
      {activeTab === 'countdowns' && (
        <section className="countdowns-section" aria-label="Countdowns list">
          {countdownEvents.length === 0 ? (
            <div className="empty-calendar-state">
              <span>⏳ No countdowns set yet.</span>
              <p>Add flights, visits, or milestones and toggle "Highlight as Countdown card".</p>
              <button
                className="btn-primary btn-sm"
                onClick={() => handleOpenAddModal()}
              >
                Create Countdown
              </button>
            </div>
          ) : (
            <div className="countdowns-grid">
              {countdownEvents.map((evt) => {
                const countdown = calculateDaysRemaining(evt.date);
                const cat = getCategoryDetails(evt.category);
                const isOwner = evt.ownerId === currentUser.id;

                return (
                  <div key={evt.id} className={`countdown-card ${cat.badgeClass}`}>
                    <div className="countdown-card-top">
                      <span className="category-pill">
                        {cat.icon} {cat.label}
                      </span>
                      <span className="visibility-pill">
                        {evt.visibility === 'partner' && '❤️ Partner Only'}
                        {evt.visibility === 'circle' && '👥 Circle'}
                        {evt.visibility === 'private' && '🔒 Private'}
                      </span>
                    </div>

                    <div className="countdown-body">
                      <div className="countdown-number-box">
                        <span className="countdown-number">{countdown.days}</span>
                        <span className="countdown-unit">
                          {countdown.isToday ? 'TODAY' : countdown.days === 1 ? 'DAY' : 'DAYS'}
                        </span>
                      </div>

                      <div className="countdown-meta">
                        <h3 className="countdown-title">{evt.title}</h3>
                        <p className="countdown-date-str">
                          📅 {formatCalendarDisplayDate(evt.date)}
                          {evt.time ? ` at ${evt.time}` : ''}
                        </p>
                        <p className="countdown-tagline">{countdown.text}</p>
                        {evt.description && (
                          <p className="countdown-desc">{evt.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="countdown-card-footer">
                      <span className="countdown-author">
                        Added by {isOwner ? 'You' : evt.ownerName}
                      </span>
                      <div className="countdown-actions">
                        <button
                          className="btn-link btn-sm"
                          onClick={() => handleOpenEditModal(evt)}
                          title="Edit event"
                          aria-label={`Edit ${evt.title}`}
                        >
                          ✏️ Edit
                        </button>
                        {isOwner && (
                          <button
                            className="btn-link btn-danger btn-sm"
                            onClick={() => handleDelete(evt.id, evt.title)}
                            title="Delete event"
                            aria-label={`Delete ${evt.title}`}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: MONTH VIEW GRID */}
      {activeTab === 'calendar' && (
        <section className="month-view-section" aria-label="Month Calendar">
          <div className="month-navigation-header">
            <button
              className="month-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
            >
              ◀ Previous
            </button>
            <h3 className="current-month-heading">{monthName}</h3>
            <button
              className="month-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next Month"
            >
              Next ▶
            </button>
          </div>

          <div className="month-grid-wrapper">
            <div className="weekday-header-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="weekday-cell">
                  {d}
                </div>
              ))}
            </div>

            <div className="days-grid">
              {/* Empty offset padding cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                <div key={`empty-${idx}`} className="day-cell day-cell-empty" />
              ))}

              {/* Day cells for the month */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const events = getEventsForDay(dayNum);
                const hasEvents = events.length > 0;
                const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
                const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`day-cell ${hasEvents ? 'has-events' : ''}`}
                    onClick={() => {
                      if (hasEvents) {
                        setSelectedDayEvents({ dateStr, events });
                      } else {
                        handleOpenAddModal(dateStr);
                      }
                    }}
                  >
                    <div className="day-cell-top">
                      <span className="day-number">{dayNum}</span>
                      {hasEvents && (
                        <span className="event-count-badge">{events.length}</span>
                      )}
                    </div>

                    <div className="day-events-preview">
                      {events.slice(0, 2).map((e) => {
                        const cat = getCategoryDetails(e.category);
                        return (
                          <div
                            key={e.id}
                            className={`mini-event-chip ${cat.badgeClass}`}
                            title={e.title}
                          >
                            <span>{cat.icon}</span>
                            <span className="chip-text">{e.title}</span>
                          </div>
                        );
                      })}
                      {events.length > 2 && (
                        <div className="more-events-chip">+{events.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Events Drawer */}
          {selectedDayEvents && (
            <div className="selected-day-drawer">
              <div className="drawer-header">
                <h4>Events for {formatCalendarDisplayDate(selectedDayEvents.dateStr)}</h4>
                <div className="drawer-actions">
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => handleOpenAddModal(selectedDayEvents.dateStr)}
                  >
                    + Add to this day
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setSelectedDayEvents(null)}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <div className="drawer-events-list">
                {selectedDayEvents.events.map((evt) => {
                  const cat = getCategoryDetails(evt.category);
                  const countdown = calculateDaysRemaining(evt.date);
                  return (
                    <div key={evt.id} className="drawer-event-item">
                      <div className="drawer-event-badge">{cat.icon}</div>
                      <div className="drawer-event-info">
                        <h5>{evt.title}</h5>
                        <p className="drawer-event-sub">
                          {cat.label} • {countdown.text} {evt.time ? `• at ${evt.time}` : ''}
                        </p>
                        {evt.description && <p className="drawer-event-desc">{evt.description}</p>}
                      </div>
                      <div className="drawer-item-actions">
                        <button
                          className="btn-link btn-sm"
                          onClick={() => handleOpenEditModal(evt)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-link btn-danger btn-sm"
                          onClick={() => handleDelete(evt.id, evt.title)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: ALL EVENTS LIST VIEW */}
      {activeTab === 'list' && (
        <section className="events-list-section" aria-label="All Events List">
          {filteredEvents.length === 0 ? (
            <div className="empty-calendar-state">
              <span>📋 No events matching the selected filter.</span>
            </div>
          ) : (
            <div className="events-list-table">
              {filteredEvents.map((evt) => {
                const cat = getCategoryDetails(evt.category);
                const countdown = calculateDaysRemaining(evt.date);
                const isOwner = evt.ownerId === currentUser.id;

                return (
                  <div key={evt.id} className="event-list-row">
                    <div className="event-icon-col">
                      <span className="row-cat-icon">{cat.icon}</span>
                    </div>

                    <div className="event-details-col">
                      <div className="event-header-line">
                        <h4 className="row-event-title">{evt.title}</h4>
                        <span className="category-tag">{cat.label}</span>
                        {evt.isCountdown && <span className="countdown-tag">⏳ Countdown</span>}
                      </div>

                      <p className="row-event-meta">
                        📅 {formatCalendarDisplayDate(evt.date)}
                        {evt.time ? ` • ${evt.time}` : ''} •{' '}
                        <span className="countdown-highlight">{countdown.text}</span> • Visibility:{' '}
                        <strong>{evt.visibility}</strong>
                      </p>

                      {evt.description && (
                        <p className="row-event-description">{evt.description}</p>
                      )}
                    </div>

                    <div className="event-actions-col">
                      <button
                        className="btn-link btn-sm"
                        onClick={() => handleOpenEditModal(evt)}
                        aria-label={`Edit event ${evt.title}`}
                      >
                        Edit
                      </button>
                      {isOwner && (
                        <button
                          className="btn-link btn-danger btn-sm"
                          onClick={() => handleDelete(evt.id, evt.title)}
                          aria-label={`Delete event ${evt.title}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ADD / EDIT EVENT MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-box calendar-modal-box">
            <div className="modal-header">
              <h3 id="modal-title">{editingEventId ? 'Edit Event' : 'Add Calendar Event'}</h3>
              <button
                className="btn-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="calendar-event-form">
              <div className="form-group">
                <label htmlFor="evt-title">Event Title *</label>
                <input
                  id="evt-title"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Flight AF007 to Paris or Maya's Birthday"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="evt-date">Date *</label>
                  <input
                    id="evt-date"
                    type="date"
                    className="input-field"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="evt-time">Time (Optional)</label>
                  <input
                    id="evt-time"
                    type="time"
                    className="input-field"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="evt-category">Category</label>
                  <select
                    id="evt-category"
                    className="input-field"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                  >
                    <option value="travel">✈️ Flight / Travel</option>
                    <option value="birthday">🎂 Birthday</option>
                    <option value="anniversary">❤️ Anniversary</option>
                    <option value="exam">📚 Exam / Study</option>
                    <option value="meeting">👥 Circle Gathering</option>
                    <option value="reminder">🔔 Reminder</option>
                    <option value="custom">⭐ Special Date</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="evt-visibility">Visibility</label>
                  <select
                    id="evt-visibility"
                    className="input-field"
                    value={formVisibility}
                    onChange={(e) => setFormVisibility(e.target.value as any)}
                  >
                    <option value="partner">❤️ Partner Only (Me + Partner)</option>
                    <option value="circle">👥 Whole Circle (Trusted Friends)</option>
                    <option value="private">🔒 Private (Only Me)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="evt-reminder">Reminder</label>
                  <select
                    id="evt-reminder"
                    className="input-field"
                    value={formReminder}
                    onChange={(e) => setFormReminder(e.target.value as any)}
                  >
                    <option value="none">None</option>
                    <option value="day_of">On the day</option>
                    <option value="1day">1 day before</option>
                    <option value="1week">1 week before</option>
                  </select>
                </div>

                <div className="form-group flex-1 checkbox-group-col">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formIsCountdown}
                      onChange={(e) => setFormIsCountdown(e.target.checked)}
                    />
                    <span>Highlight as Countdown Card</span>
                  </label>
                  <span className="field-hint">Displays high-visibility days counter</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="evt-desc">Notes & Details</label>
                <textarea
                  id="evt-desc"
                  className="input-field"
                  rows={3}
                  placeholder="Flight terminal, itinerary notes, exam subjects, or surprise ideas..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="travel-safety-note">
                <span className="note-icon">💡</span>
                <span>
                  <strong>Travel Safe:</strong> Flight and travel logs are stored securely as manual agenda entries without automated GPS scraping.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingEventId ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
