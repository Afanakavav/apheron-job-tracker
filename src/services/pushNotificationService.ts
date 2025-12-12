// Push Notification Service for PWA
import { getUserApplications } from './applicationService';
import { getUpcomingInterviews } from './analyticsService';
import type { Application } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Schedule interview reminder notifications
 */
export const scheduleInterviewReminders = async (userId: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const applications = await getUserApplications(userId);
    const upcomingInterviews = getUpcomingInterviews(applications);
    const now = new Date();

    upcomingInterviews.forEach((app: Application & { nextInterviewDate?: Date }) => {
      if (!app.nextInterviewDate) return;

      const interviewDate = app.nextInterviewDate instanceof Date 
        ? app.nextInterviewDate 
        : new Date(app.nextInterviewDate);

      if (interviewDate <= now) return; // Skip past interviews

      // 1 hour before reminder
      const oneHourBefore = new Date(interviewDate);
      oneHourBefore.setHours(oneHourBefore.getHours() - 1);
      const oneHourDelay = oneHourBefore.getTime() - now.getTime();

      if (oneHourDelay > 0) {
        setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification(`Colloquio tra 1 ora: ${app.jobTitle}`, {
              body: `${app.company} - ${format(interviewDate, 'HH:mm', { locale: it })}`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `interview-${app.id}-${interviewDate.getTime()}`,
              requireInteraction: true,
              data: {
                url: `/applications?id=${app.id}`,
                applicationId: app.id,
              },
            });
            
            // Vibrate if supported
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
          }
        }, oneHourDelay);
      }
    });
  } catch (error) {
    console.error('Error scheduling interview reminders:', error);
  }
};

/**
 * Send immediate push notification
 */
export const sendPushNotification = (
  title: string,
  options?: NotificationOptions
) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  return new Notification(title, {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options,
  });
};

/**
 * Setup periodic reminder checks
 */
export const setupPeriodicReminders = (userId: string, intervalMinutes: number = 60) => {
  // Check every hour for upcoming interviews
  const interval = setInterval(() => {
    scheduleInterviewReminders(userId);
  }, intervalMinutes * 60 * 1000);

  // Initial check
  scheduleInterviewReminders(userId);

  return () => clearInterval(interval);
};

