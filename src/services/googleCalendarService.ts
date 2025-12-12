// Google Calendar Service - Client-side implementation using Google Identity Services
import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

// OAuth2 configuration
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

// Calendar Event interface
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string;
}

/**
 * Initialize Google OAuth client for Calendar
 */
let calendarTokenClient: any = null;

export const initializeGoogleCalendarAuth = () => {
  return new Promise((resolve) => {
    if (calendarTokenClient) {
      resolve(calendarTokenClient);
      return;
    }

    // @ts-ignore
    if (typeof google !== 'undefined' && google.accounts) {
      // @ts-ignore
      calendarTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: CALENDAR_SCOPES,
        callback: '', // Will be set in requestCalendarAccessToken
      });
      resolve(calendarTokenClient);
    } else {
      // Load Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        // @ts-ignore
        calendarTokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: CALENDAR_SCOPES,
          callback: '', // Will be set in requestCalendarAccessToken
        });
        resolve(calendarTokenClient);
      };
      document.head.appendChild(script);
    }
  });
};

/**
 * Request access token for Google Calendar (triggers OAuth popup)
 */
export const requestCalendarAccessToken = async (userId: string): Promise<string> => {
  await initializeGoogleCalendarAuth();

  return new Promise((resolve, reject) => {
    try {
      calendarTokenClient.callback = async (response: any) => {
        if (response.error) {
          reject(response.error);
          return;
        }

        // Save token to Firestore
        await saveCalendarTokens(userId, {
          access_token: response.access_token,
          expires_in: response.expires_in,
          token_type: response.token_type,
          scope: response.scope,
        });

        resolve(response.access_token);
      };

      // Trigger OAuth popup
      calendarTokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Save Google Calendar tokens to Firestore
 */
export const saveCalendarTokens = async (userId: string, tokens: any) => {
  const tokenRef = doc(db, 'users', userId, 'calendar_tokens', 'current');

  await setDoc(tokenRef, {
    accessToken: tokens.access_token,
    expiresAt: Date.now() + (tokens.expires_in * 1000),
    tokenType: tokens.token_type,
    scope: tokens.scope,
    updatedAt: new Date(),
  });
};

/**
 * Get Google Calendar tokens from Firestore
 */
export const getCalendarTokens = async (userId: string) => {
  const tokenRef = doc(db, 'users', userId, 'calendar_tokens', 'current');
  const tokenSnap = await getDoc(tokenRef);

  if (!tokenSnap.exists()) {
    return null;
  }

  const data = tokenSnap.data();
  
  // Check if token is expired
  if (data.expiresAt < Date.now()) {
    // Token expired, need to re-authorize
    return null;
  }

  return {
    access_token: data.accessToken,
    token_type: data.tokenType,
    scope: data.scope,
  };
};

/**
 * Disconnect Google Calendar (delete tokens)
 */
export const disconnectCalendar = async (userId: string) => {
  const tokenRef = doc(db, 'users', userId, 'calendar_tokens', 'current');
  await deleteDoc(tokenRef);
};

/**
 * Check if user has connected Google Calendar
 */
export const isCalendarConnected = async (userId: string): Promise<boolean> => {
  const tokens = await getCalendarTokens(userId);
  return tokens !== null;
};

/**
 * Get valid access token (re-authorize if needed)
 */
const getValidCalendarAccessToken = async (userId: string): Promise<string> => {
  const tokens = await getCalendarTokens(userId);

  if (!tokens) {
    // Need to re-authorize
    return await requestCalendarAccessToken(userId);
  }

  return tokens.access_token;
};

/**
 * Create an event in Google Calendar
 */
export const createCalendarEvent = async (
  userId: string,
  event: CalendarEvent
): Promise<string> => {
  try {
    const accessToken = await getValidCalendarAccessToken(userId);

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || response.statusText}`);
    }

    const createdEvent = await response.json();
    return createdEvent.id;
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
};

/**
 * Update an event in Google Calendar
 */
export const updateCalendarEvent = async (
  userId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<void> => {
  try {
    const accessToken = await getValidCalendarAccessToken(userId);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || response.statusText}`);
    }
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    throw new Error(`Failed to update calendar event: ${error.message}`);
  }
};

/**
 * Delete an event from Google Calendar
 */
export const deleteCalendarEvent = async (
  userId: string,
  eventId: string
): Promise<void> => {
  try {
    const accessToken = await getValidCalendarAccessToken(userId);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || response.statusText}`);
    }
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    throw new Error(`Failed to delete calendar event: ${error.message}`);
  }
};

/**
 * List events from Google Calendar
 */
export const listCalendarEvents = async (
  userId: string,
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 50
): Promise<CalendarEvent[]> => {
  try {
    const accessToken = await getValidCalendarAccessToken(userId);

    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (timeMin) {
      params.append('timeMin', timeMin);
    } else {
      // Default to now
      params.append('timeMin', new Date().toISOString());
    }

    if (timeMax) {
      params.append('timeMax', timeMax);
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error: any) {
    console.error('Error listing calendar events:', error);
    throw new Error(`Failed to list calendar events: ${error.message}`);
  }
};

/**
 * Sync interview to Google Calendar
 * Creates or updates an event based on interview data
 */
export const syncInterviewToCalendar = async (
  userId: string,
  interviewData: {
    applicationId: string;
    jobTitle: string;
    company: string;
    interviewDate: Date;
    interviewType: string;
    location?: string;
    notes?: string;
    googleCalendarEventId?: string;
  }
): Promise<string> => {
  // Map interview type to label
  const getInterviewTypeLabel = (type: string): string => {
    switch (type) {
      case 'interview_1':
        return 'Colloquio Recruiter';
      case 'interview_2':
        return 'Colloquio Manager';
      case 'interview_3':
        return 'Colloquio Tecnico';
      case 'interview_4':
        return 'Colloquio Panel';
      default:
        return 'Colloquio';
    }
  };
  const interviewTypeLabel = getInterviewTypeLabel(interviewData.interviewType);
  const event: CalendarEvent = {
    summary: `Colloquio: ${interviewData.jobTitle} - ${interviewData.company}`,
    description: `Tipo: ${interviewTypeLabel}\n${interviewData.notes || ''}\n\nCandidatura ID: ${interviewData.applicationId}`,
    start: {
      dateTime: interviewData.interviewDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: new Date(interviewData.interviewDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    location: interviewData.location,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
    colorId: '9', // Blue color for interviews
  };

  if (interviewData.googleCalendarEventId) {
    // Update existing event
    await updateCalendarEvent(userId, interviewData.googleCalendarEventId, event);
    return interviewData.googleCalendarEventId;
  } else {
    // Create new event
    return await createCalendarEvent(userId, event);
  }
};

/**
 * Sync all interviews from applications to Google Calendar
 */
export const syncAllInterviewsToCalendar = async (
  userId: string,
  applications: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location?: string;
    interviewDates?: Array<{
      date: Date | string;
      type: string;
      notes?: string;
      googleCalendarEventId?: string;
    }>;
  }>
): Promise<{ synced: number; errors: number }> => {
  let synced = 0;
  let errors = 0;

  for (const app of applications) {
    if (!app.interviewDates || app.interviewDates.length === 0) continue;

    for (const interview of app.interviewDates) {
      try {
        const interviewDate = interview.date instanceof Date 
          ? interview.date 
          : new Date(interview.date);

        // Skip past interviews
        if (interviewDate < new Date()) continue;

        await syncInterviewToCalendar(userId, {
          applicationId: app.id,
          jobTitle: app.jobTitle,
          company: app.company,
          interviewDate,
          interviewType: interview.type,
          location: app.location,
          notes: interview.notes,
          googleCalendarEventId: interview.googleCalendarEventId,
        });

        // Update the interview with the Google Calendar event ID
        // This would need to be done through the application service
        synced++;
      } catch (error) {
        console.error(`Error syncing interview for ${app.jobTitle}:`, error);
        errors++;
      }
    }
  }

  return { synced, errors };
};

