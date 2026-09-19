import { CalendarEvent } from '../types';

export interface CountdownInfo {
  days: number;
  isToday: boolean;
  isPast: boolean;
  text: string;
}

export interface CategoryDetails {
  label: string;
  icon: string;
  badgeClass: string;
}

/**
 * Calculates remaining days until target date
 */
export function calculateDaysRemaining(targetDateStr: string, baseDate: Date = new Date()): CountdownInfo {
  // Normalize both dates to midnight local time to count calendar days
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);

  const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  current.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - current.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      days: 0,
      isToday: true,
      isPast: false,
      text: 'Today! 🎉',
    };
  }

  if (diffDays > 0) {
    return {
      days: diffDays,
      isToday: false,
      isPast: false,
      text: diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`,
    };
  }

  const pastDays = Math.abs(diffDays);
  return {
    days: pastDays,
    isToday: false,
    isPast: true,
    text: pastDays === 1 ? 'Yesterday' : `${pastDays} days ago`,
  };
}

/**
 * Validates if the current user has permission to view the given calendar event
 */
export function canUserViewCalendarEvent(
  event: CalendarEvent,
  currentUserId: string,
  partnerId?: string
): boolean {
  if (event.ownerId === currentUserId) return true;
  if (event.visibility === 'circle' || event.visibility === 'group') return true;
  if (event.visibility === 'partner') {
    return currentUserId === partnerId || currentUserId === event.ownerId;
  }
  return false;
}

/**
 * Returns UI badge icon and label for each category
 */
export function getCategoryDetails(category: CalendarEvent['category']): CategoryDetails {
  switch (category) {
    case 'birthday':
      return { label: 'Birthday', icon: '🎂', badgeClass: 'cat-birthday' };
    case 'anniversary':
      return { label: 'Anniversary', icon: '❤️', badgeClass: 'cat-anniversary' };
    case 'travel':
      return { label: 'Flight / Travel', icon: '✈️', badgeClass: 'cat-travel' };
    case 'exam':
      return { label: 'Exam / Study', icon: '📚', badgeClass: 'cat-exam' };
    case 'meeting':
      return { label: 'Circle Gathering', icon: '👥', badgeClass: 'cat-meeting' };
    case 'reminder':
      return { label: 'Reminder', icon: '🔔', badgeClass: 'cat-reminder' };
    case 'custom':
    default:
      return { label: 'Special Date', icon: '⭐', badgeClass: 'cat-custom' };
  }
}

/**
 * Formats YYYY-MM-DD into a localized friendly date
 */
export function formatCalendarDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
