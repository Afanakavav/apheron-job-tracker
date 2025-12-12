// Email Notification Service
// Sends email notifications for interviews, follow-ups, and reminders

import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Application } from '../types';

export interface EmailNotification {
  id?: string;
  userId: string;
  type: 'interview_reminder' | 'follow_up' | 'weekly_summary' | 'new_job_match';
  recipient: string; // Email address
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  scheduledFor?: Date;
  sentAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Schedule email notification
 * Note: This stores the notification in Firestore. Actual sending should be done via Cloud Function
 */
export const scheduleEmailNotification = async (
  notification: Omit<EmailNotification, 'id' | 'createdAt' | 'status'>
): Promise<string> => {
  try {
    const notificationData: Omit<EmailNotification, 'id'> = {
      ...notification,
      status: 'pending',
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'email_notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error scheduling email notification:', error);
    throw error;
  }
};

/**
 * Schedule interview reminder email
 */
export const scheduleInterviewReminder = async (
  userId: string,
  application: Application,
  reminderHours: number = 24
): Promise<string> => {
  if (!application.interviewDates || application.interviewDates.length === 0) {
    throw new Error('No interview dates found');
  }

  const nextInterview = application.interviewDates
    .map(d => d instanceof Date ? d : new Date(d.date || d))
    .filter(d => d > new Date())
    .sort((a, b) => a.getTime() - b.getTime())[0];

  if (!nextInterview) {
    throw new Error('No upcoming interviews');
  }

  const scheduledFor = new Date(nextInterview);
  scheduledFor.setHours(scheduledFor.getHours() - reminderHours);

  const subject = `Promemoria Colloquio: ${application.jobTitle} - ${application.company}`;
  const body = `
Ciao,

Ti ricordiamo che hai un colloquio programmato:

Posizione: ${application.jobTitle}
Azienda: ${application.company}
Data e Ora: ${nextInterview.toLocaleString('it-IT')}
${application.location ? `Luogo: ${application.location}` : ''}

Buona fortuna!

Apheron Job Tracker
  `.trim();

  return scheduleEmailNotification({
    userId,
    type: 'interview_reminder',
    recipient: userId, // Will be resolved to email in Cloud Function
    subject,
    body,
    scheduledFor,
    metadata: {
      applicationId: application.id,
      interviewDate: nextInterview.toISOString(),
      reminderHours,
    },
  });
};

/**
 * Schedule follow-up reminder email
 */
export const scheduleFollowUpReminder = async (
  userId: string,
  application: Application
): Promise<string> => {
  if (!application.nextFollowUpDate) {
    throw new Error('No follow-up date set');
  }

  const scheduledFor = new Date(application.nextFollowUpDate);

  const subject = `Follow-Up Necessario: ${application.jobTitle} - ${application.company}`;
  const body = `
Ciao,

È il momento di fare follow-up per questa candidatura:

Posizione: ${application.jobTitle}
Azienda: ${application.company}
Data candidatura: ${application.appliedDate ? application.appliedDate.toLocaleDateString('it-IT') : 'N/A'}
Stato attuale: ${application.status}

Ricorda di essere professionale e cortese nel tuo follow-up.

Apheron Job Tracker
  `.trim();

  return scheduleEmailNotification({
    userId,
    type: 'follow_up',
    recipient: userId,
    subject,
    body,
    scheduledFor,
    metadata: {
      applicationId: application.id,
    },
  });
};

/**
 * Schedule weekly summary email
 */
export const scheduleWeeklySummary = async (
  userId: string,
  summary: {
    applicationsThisWeek: number;
    interviewsThisWeek: number;
    followUpsNeeded: number;
    offersReceived: number;
  }
): Promise<string> => {
  const subject = 'Riepilogo Settimanale - Apheron Job Tracker';
  const body = `
Ciao,

Ecco il tuo riepilogo settimanale:

📊 Candidature questa settimana: ${summary.applicationsThisWeek}
📅 Colloqui questa settimana: ${summary.interviewsThisWeek}
📧 Follow-up necessari: ${summary.followUpsNeeded}
🎉 Offerte ricevute: ${summary.offersReceived}

Continua così! 🚀

Apheron Job Tracker
  `.trim();

  // Schedule for next Monday at 9 AM
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + (8 - scheduledFor.getDay()) % 7 || 7);
  scheduledFor.setHours(9, 0, 0, 0);

  return scheduleEmailNotification({
    userId,
    type: 'weekly_summary',
    recipient: userId,
    subject,
    body,
    scheduledFor,
    metadata: summary,
  });
};

/**
 * Get pending email notifications for a user
 */
export const getPendingEmailNotifications = async (userId: string): Promise<EmailNotification[]> => {
  try {
    const q = query(
      collection(db, 'email_notifications'),
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('scheduledFor', 'asc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      scheduledFor: doc.data().scheduledFor?.toDate(),
      sentAt: doc.data().sentAt?.toDate(),
    })) as EmailNotification[];
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    return [];
  }
};

