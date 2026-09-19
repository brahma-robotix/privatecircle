/**
 * Notification Service
 * In-app alert dispatching, unread tracking, and audio cue simulation
 */

import { AppNotification } from '../types';

export const NotificationService = {
  createNotification: (
    title: string,
    message: string,
    type: AppNotification['type'],
    linkView?: AppNotification['linkView']
  ): AppNotification => {
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      timestamp: 'Just now',
      isRead: false,
      linkView,
    };
  },
};
