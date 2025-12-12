// ==================== BROWSER NOTIFICATION SERVICE ====================
// Manages browser notifications for follow-ups and other reminders

import type { Application } from '../types';

/**
 * Request browser notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('🔕 Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('🔕 Notification permission denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Show a browser notification
 */
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (!('Notification' in window)) {
    console.warn('🔕 Browser does not support notifications');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('🔕 Notification permission not granted');
    return;
  }

  try {
    new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
    });
  } catch (error) {
    console.error('❌ Error showing notification:', error);
  }
};

/**
 * Check for follow-ups due today and show notifications
 */
export const checkFollowUpNotifications = (applications: Application[]): void => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUpsDueToday = applications.filter((app) => {
    if (!app.followUpEnabled || !app.nextFollowUpDate) return false;
    
    const followUpDate = new Date(app.nextFollowUpDate);
    followUpDate.setHours(0, 0, 0, 0);
    
    return followUpDate.getTime() === today.getTime();
  });

  if (followUpsDueToday.length === 0) return;

  // Show notification for each follow-up due today
  followUpsDueToday.forEach((app) => {
    showNotification(
      '📅 Promemoria Follow-Up',
      {
        body: `È il momento di fare follow-up per: ${app.jobTitle} - ${app.company}`,
        tag: `followup-${app.id}`, // Prevent duplicate notifications
        requireInteraction: true,
      }
    );
  });
};

/**
 * Check for overdue follow-ups and show notifications
 */
export const checkOverdueFollowUpNotifications = (applications: Application[]): void => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueFollowUps = applications.filter((app) => {
    if (!app.followUpEnabled || !app.nextFollowUpDate) return false;
    
    const followUpDate = new Date(app.nextFollowUpDate);
    followUpDate.setHours(0, 0, 0, 0);
    
    return followUpDate < today;
  });

  if (overdueFollowUps.length === 0) return;

  // Show a summary notification for overdue follow-ups
  if (overdueFollowUps.length === 1) {
    const app = overdueFollowUps[0];
    showNotification(
      '⚠️ Follow-Up in Ritardo',
      {
        body: `Follow-up scaduto per: ${app.jobTitle} - ${app.company}`,
        tag: `overdue-${app.id}`,
        requireInteraction: true,
      }
    );
  } else {
    showNotification(
      '⚠️ Follow-Up in Ritardo',
      {
        body: `Hai ${overdueFollowUps.length} follow-up in ritardo`,
        tag: 'overdue-summary',
        requireInteraction: true,
      }
    );
  }
};

/**
 * Initialize notification system
 * Checks for due/overdue follow-ups on load and sets up periodic checks
 */
export const initializeNotifications = async (applications: Application[]): Promise<void> => {
  const hasPermission = await requestNotificationPermission();
  
  if (!hasPermission) {
    console.log('🔕 Notification permission not granted, skipping notification checks');
    return;
  }

  // Check immediately
  checkFollowUpNotifications(applications);
  checkOverdueFollowUpNotifications(applications);

  // Check every 30 minutes
  setInterval(() => {
    checkFollowUpNotifications(applications);
    checkOverdueFollowUpNotifications(applications);
  }, 30 * 60 * 1000); // 30 minutes
};

