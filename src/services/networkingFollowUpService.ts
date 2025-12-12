// Networking Follow-up Notification Service
import { getContactsNeedingFollowUp } from './networkingService';
import { sendPushNotification } from './pushNotificationService';
import type { Contact } from '../types';

/**
 * Check contacts needing follow-up and send notifications
 */
export const checkAndNotifyFollowUps = async (userId: string): Promise<void> => {
  try {
    const contactsNeedingFollowUp = await getContactsNeedingFollowUp(userId);
    
    if (contactsNeedingFollowUp.length === 0) {
      return;
    }

    // Group contacts by urgency (days since last contact)
    const now = new Date();
    const urgent: Contact[] = [];
    const normal: Contact[] = [];

    contactsNeedingFollowUp.forEach(contact => {
      if (!contact.lastContactDate) return;
      
      const daysSince = Math.floor(
        (now.getTime() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Urgent if more than 2x the reminder days
      const reminderDays = contact.followUpReminderDays || 14;
      if (daysSince >= reminderDays * 2) {
        urgent.push(contact);
      } else {
        normal.push(contact);
      }
    });

    // Send notification for urgent contacts
    if (urgent.length > 0) {
      const contactText = urgent.length === 1 ? 'contatto' : 'contatti';
      sendPushNotification(
        `⚠️ Follow-up urgente richiesto`,
        {
          body: `Hai ${urgent.length} ${contactText} che richiedono follow-up urgente.`,
          tag: 'networking-follow-up-urgent',
          data: {
            url: '/networking',
            contactCount: urgent.length,
            type: 'urgent',
          },
          requireInteraction: false,
          badge: '/icon-192.png',
          icon: '/icon-192.png',
        }
      );
    }

    // Send notification for normal follow-ups (only if no urgent ones, to avoid spam)
    if (normal.length > 0 && urgent.length === 0) {
      const contactText = normal.length === 1 ? 'contatto' : 'contatti';
      sendPushNotification(
        `📞 Follow-up richiesto`,
        {
          body: `Hai ${normal.length} ${contactText} che richiedono follow-up.`,
          tag: 'networking-follow-up',
          data: {
            url: '/networking',
            contactCount: normal.length,
            type: 'normal',
          },
          requireInteraction: false,
          badge: '/icon-192.png',
          icon: '/icon-192.png',
        }
      );
    }
  } catch (error) {
    console.error('Error checking and notifying follow-ups:', error);
  }
};

/**
 * Schedule periodic checks for follow-ups
 * Returns cleanup function to stop the interval
 */
export const scheduleFollowUpChecks = (userId: string): (() => void) => {
  // Check immediately on mount
  checkAndNotifyFollowUps(userId);
  
  // Then check every 6 hours
  const interval = setInterval(() => {
    checkAndNotifyFollowUps(userId);
  }, 6 * 60 * 60 * 1000); // 6 hours
  
  // Return cleanup function
  return () => {
    clearInterval(interval);
  };
};

/**
 * Get follow-up summary for dashboard
 */
export const getFollowUpSummary = async (userId: string): Promise<{
  total: number;
  urgent: number;
  normal: number;
  contacts: Contact[];
}> => {
  try {
    const contacts = await getContactsNeedingFollowUp(userId);
    const now = new Date();
    
    let urgent = 0;
    let normal = 0;
    
    contacts.forEach(contact => {
      if (!contact.lastContactDate) return;
      
      const daysSince = Math.floor(
        (now.getTime() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const reminderDays = contact.followUpReminderDays || 14;
      if (daysSince >= reminderDays * 2) {
        urgent++;
      } else {
        normal++;
      }
    });
    
    return {
      total: contacts.length,
      urgent,
      normal,
      contacts,
    };
  } catch (error) {
    console.error('Error getting follow-up summary:', error);
    return {
      total: 0,
      urgent: 0,
      normal: 0,
      contacts: [],
    };
  }
};

