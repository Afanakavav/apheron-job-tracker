// Job Alert Notification Service
import { checkJobAlerts } from './jobSearchService';
import { sendPushNotification } from './pushNotificationService';

/**
 * Check and notify about new jobs matching alerts
 */
export const checkAndNotifyJobAlerts = async (userId: string): Promise<void> => {
  try {
    const results = await checkJobAlerts(userId);
    
    for (const result of results) {
      if (result.newJobs.length > 0) {
        const jobCount = result.newJobs.length;
        const jobText = jobCount === 1 ? 'posizione' : 'posizioni';
        
        sendPushNotification(
          `🔔 Nuove posizioni trovate!`,
          {
            body: `Trovate ${jobCount} nuove ${jobText} che corrispondono ai tuoi criteri.`,
            tag: `job-alert-${result.alertId}`,
            data: {
              url: '/job-search',
              alertId: result.alertId,
              jobCount: jobCount,
            },
            requireInteraction: false,
            badge: '/icon-192.png',
            icon: '/icon-192.png',
          }
        );
      }
    }
  } catch (error) {
    console.error('Error checking and notifying job alerts:', error);
  }
};

/**
 * Schedule periodic checks for job alerts
 * Returns cleanup function to stop the interval
 */
export const scheduleJobAlertChecks = (userId: string): (() => void) => {
  // Check immediately on mount
  checkAndNotifyJobAlerts(userId);
  
  // Then check every hour
  const interval = setInterval(() => {
    checkAndNotifyJobAlerts(userId);
  }, 60 * 60 * 1000); // 1 hour
  
  return () => clearInterval(interval);
};

/**
 * Check alerts based on frequency
 */
export const checkAlertsByFrequency = async (
  userId: string,
  frequency: 'daily' | 'weekly' | 'realtime'
): Promise<void> => {
  const now = new Date();
  const hour = now.getHours();
  
  switch (frequency) {
    case 'realtime':
      // Check every 15 minutes
      await checkAndNotifyJobAlerts(userId);
      break;
    case 'daily':
      // Check once per day at 9 AM
      if (hour === 9) {
        await checkAndNotifyJobAlerts(userId);
      }
      break;
    case 'weekly':
      // Check once per week on Monday at 9 AM
      if (now.getDay() === 1 && hour === 9) {
        await checkAndNotifyJobAlerts(userId);
      }
      break;
  }
};

