// Gmail Service - Client-side implementation using Google Identity Services
import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

// OAuth2 configuration
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Email interface
export interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: Date;
  snippet: string;
  body: string;
  labels: string[];
}

// Job offer extracted from email
export interface JobOfferFromEmail {
  company: string;
  jobTitle: string;
  location?: string;
  salary?: string;
  jobDescription: string;
  jobUrl?: string;
  source: 'email';
  emailId: string;
  emailSubject: string;
  emailDate: Date;
  confidence: number; // 0-100 how confident AI is that this is a job offer
}

/**
 * Initialize Google OAuth client
 */
let tokenClient: any = null;

export const initializeGoogleAuth = () => {
  return new Promise((resolve) => {
    if (tokenClient) {
      resolve(tokenClient);
      return;
    }

    // @ts-ignore
    if (typeof google !== 'undefined' && google.accounts) {
      // @ts-ignore
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Will be set in requestAccessToken
      });
      resolve(tokenClient);
    } else {
      // Load Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        // @ts-ignore
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '', // Will be set in requestAccessToken
        });
        resolve(tokenClient);
      };
      document.head.appendChild(script);
    }
  });
};

/**
 * Request access token (triggers OAuth popup)
 */
export const requestAccessToken = async (userId: string): Promise<string> => {
  await initializeGoogleAuth();

  return new Promise((resolve, reject) => {
    try {
      tokenClient.callback = async (response: any) => {
        if (response.error) {
          reject(response.error);
          return;
        }

        // Save token to Firestore
        await saveGmailTokens(userId, {
          access_token: response.access_token,
          expires_in: response.expires_in,
          token_type: response.token_type,
          scope: response.scope,
        });

        resolve(response.access_token);
      };

      // Trigger OAuth popup
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Save Gmail tokens to Firestore
 */
export const saveGmailTokens = async (userId: string, tokens: any) => {
  const tokenRef = doc(db, 'users', userId, 'gmail_tokens', 'current');

  await setDoc(tokenRef, {
    accessToken: tokens.access_token,
    expiresAt: Date.now() + (tokens.expires_in * 1000),
    tokenType: tokens.token_type,
    scope: tokens.scope,
    updatedAt: new Date(),
  });
};

/**
 * Get Gmail tokens from Firestore
 */
export const getGmailTokens = async (userId: string) => {
  const tokenRef = doc(db, 'users', userId, 'gmail_tokens', 'current');
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
 * Disconnect Gmail (delete tokens)
 */
export const disconnectGmail = async (userId: string) => {
  const tokenRef = doc(db, 'users', userId, 'gmail_tokens', 'current');
  await deleteDoc(tokenRef);
};

/**
 * Check if user has connected Gmail
 */
export const isGmailConnected = async (userId: string): Promise<boolean> => {
  const tokens = await getGmailTokens(userId);
  return tokens !== null;
};

/**
 * Get valid access token (re-authorize if needed)
 */
const getValidAccessToken = async (userId: string): Promise<string> => {
  const tokens = await getGmailTokens(userId);

  if (!tokens) {
    // Need to re-authorize
    return await requestAccessToken(userId);
  }

  return tokens.access_token;
};

/**
 * Fetch recent emails using Gmail API
 */
export const fetchRecentEmails = async (
  userId: string,
  maxResults: number = 20,
  query: string = ''
): Promise<GmailEmail[]> => {
  try {
    const accessToken = await getValidAccessToken(userId);

    // Build query for job-related emails
    const searchQuery = query || 'subject:(job OR opportunity OR hiring OR position OR career OR opening) newer_than:30d';

    // List messages
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      throw new Error(`Gmail API error: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();

    if (!listData.messages) {
      return [];
    }

    // Fetch full message details
    const emails: GmailEmail[] = [];

    for (const message of listData.messages) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!msgResponse.ok) {
        console.error(`Failed to fetch message ${message.id}`);
        continue;
      }

      const msg = await msgResponse.json();

      const headers = msg.payload?.headers || [];
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';

      // Extract body
      let body = '';
      if (msg.payload?.body?.data) {
        body = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (msg.payload?.parts) {
        // Multi-part message
        for (const part of msg.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
            // Fallback to HTML if no plain text
            body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }
      }

      emails.push({
        id: msg.id!,
        threadId: msg.threadId!,
        subject,
        from,
        date: new Date(dateHeader),
        snippet: msg.snippet || '',
        body,
        labels: msg.labelIds || [],
      });
    }

    return emails;
  } catch (error: any) {
    console.error('Error fetching emails:', error);
    throw new Error(`Failed to fetch emails: ${error.message}`);
  }
};

/**
 * Get user email address
 */
export const getGmailUserEmail = async (userId: string): Promise<string> => {
  try {
    const accessToken = await getValidAccessToken(userId);

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.emailAddress || '';
  } catch (error: any) {
    console.error('Error getting user email:', error);
    throw new Error(`Failed to get user email: ${error.message}`);
  }
};

