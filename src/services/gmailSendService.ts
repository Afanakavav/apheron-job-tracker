/**
 * Gmail Send Service
 * Handles sending emails via Gmail API with attachments
 */

import { getGmailTokens } from './gmailServiceClient';
import { getAuth } from 'firebase/auth';
import { saveSentEmail } from './sentEmailService';

/**
 * Attachment interface
 */
export interface EmailAttachment {
  fileUrl: string;
  fileName: string;
}

/**
 * Send email via Gmail API with multiple attachments (new flexible version)
 */
export const sendEmailViaGmailWithAttachments = async (
  to: string,
  subject: string,
  body: string,
  attachments: Array<{ base64: string; fileName: string }>,
  options?: {
    applicationId?: string;
    emailType?: 'application' | 'confirmation' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined';
  }
): Promise<void> => {
  try {
    console.log('📧 [GmailSend] Sending email...', { to, subject, attachmentsCount: attachments.length });

    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    // Get access token
    const tokens = await getGmailTokens(user.uid);
    if (!tokens || !tokens.access_token) {
      throw new Error('Gmail non connesso. Connetti il tuo account Gmail prima di inviare email.');
    }
    
    const accessToken = tokens.access_token;

    console.log(`📎 [GmailSend] Total attachments: ${attachments.length}`);

    // Create email message
    const email = createEmailMessage(to, subject, body, attachments, user.uid);

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [GmailSend] Gmail API error:', errorData);
      
      if (response.status === 401) {
        throw new Error('Sessione Gmail scaduta. Riconnetti il tuo account.');
      }
      
      throw new Error(errorData.error?.message || 'Errore nell\'invio dell\'email');
    }

    const data = await response.json();
    console.log('✅ [GmailSend] Email sent successfully:', data);

    // Save sent email to Firestore
    try {
      console.log('💾 [GmailSend] Attempting to save email to archive...', {
        userId: user.uid,
        to,
        subject: subject.substring(0, 50),
        attachmentsCount: attachments.length,
        emailType: options?.emailType,
        applicationId: options?.applicationId,
      });
      const attachmentNames = attachments.map(att => att.fileName);
      const emailId = await saveSentEmail(
        user.uid,
        to,
        subject,
        body,
        attachmentNames,
        options?.emailType,
        options?.applicationId
      );
      console.log('✅ [GmailSend] Email saved to archive with ID:', emailId);
    } catch (saveError: any) {
      // Don't fail the email send if save fails
      console.error('⚠️ [GmailSend] Failed to save email to archive:', saveError);
      console.error('⚠️ [GmailSend] Error details:', {
        message: saveError?.message,
        code: saveError?.code,
        stack: saveError?.stack,
      });
    }
  } catch (error: any) {
    console.error('❌ [GmailSend] Error sending email:', error);
    throw error;
  }
};

/**
 * Send email via Gmail API with multiple attachments (legacy version - kept for backward compatibility)
 */
export const sendEmailViaGmail = async (
  to: string,
  subject: string,
  body: string,
  cvFileUrl?: string,
  cvFileName?: string,
  coverLetterFileUrl?: string,
  coverLetterFileName?: string
): Promise<void> => {
  try {
    console.log('📧 [GmailSend] Sending email...', { to, subject });

    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    // Get access token
    const tokens = await getGmailTokens(user.uid);
    if (!tokens || !tokens.access_token) {
      throw new Error('Gmail non connesso. Connetti il tuo account Gmail prima di inviare email.');
    }
    
    const accessToken = tokens.access_token;

    // Collect all attachments
    const attachments: Array<{ base64: string; fileName: string }> = [];

    // Fetch CV file if provided
    if (cvFileUrl && cvFileName) {
      console.log('📎 [GmailSend] Fetching CV attachment...');
      const cvBase64 = await fetchFileAsBase64(cvFileUrl);
      attachments.push({ base64: cvBase64, fileName: cvFileName });
    }

    // Fetch Cover Letter file if provided
    if (coverLetterFileUrl && coverLetterFileName) {
      console.log('📄 [GmailSend] Fetching Cover Letter attachment...');
      const clBase64 = await fetchFileAsBase64(coverLetterFileUrl);
      attachments.push({ base64: clBase64, fileName: coverLetterFileName });
    }

    console.log(`📎 [GmailSend] Total attachments: ${attachments.length}`);

    // Create email message (pass userId to get correct Gmail email)
    const email = createEmailMessage(to, subject, body, attachments, user.uid);

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [GmailSend] Gmail API error:', errorData);
      
      if (response.status === 401) {
        throw new Error('Sessione Gmail scaduta. Riconnetti il tuo account.');
      }
      
      throw new Error(errorData.error?.message || 'Errore nell\'invio dell\'email');
    }

    const data = await response.json();
    console.log('✅ [GmailSend] Email sent successfully:', data);
  } catch (error: any) {
    console.error('❌ [GmailSend] Error sending email:', error);
    throw error;
  }
};

/**
 * Fetch file and convert to base64
 */
const fetchFileAsBase64 = async (fileUrl: string): Promise<string> => {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Impossibile scaricare il file');
    }

    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (error) {
    console.error('Error fetching file:', error);
    throw new Error('Errore nel caricamento del file da allegare');
  }
};

/**
 * Convert Blob to base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data:*/*;base64, prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Create RFC 2822 formatted email message with multiple attachments
 */
const createEmailMessage = (
  to: string,
  subject: string,
  body: string,
  attachments: Array<{ base64: string; fileName: string }>,
  userId?: string
): string => {
  const boundary = '----=_Part_' + Math.random().toString(36).substring(2);
  
  // Get Gmail email from localStorage (correct key)
  let fromEmail = 'me';
  if (userId) {
    const gmailIntegrationKey = `gmail_integration_state_${userId}`;
    const stateStr = localStorage.getItem(gmailIntegrationKey);
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        fromEmail = state.gmailEmail || 'me';
        console.log('📧 [GmailSend] Using sender email:', fromEmail);
      } catch (err) {
        console.error('Error parsing Gmail state:', err);
      }
    }
  }

  let message = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
  ];

  if (attachments.length > 0) {
    // Email with attachments
    message.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    message.push('');
    
    // Add body part
    message.push(`--${boundary}`);
    message.push('Content-Type: text/plain; charset="UTF-8"');
    message.push('Content-Transfer-Encoding: 7bit');
    message.push('');
    message.push(body);
    message.push('');
    
    // Add all attachments
    attachments.forEach((attachment) => {
      message.push(`--${boundary}`);
      message.push(`Content-Type: application/octet-stream; name="${attachment.fileName}"`);
      message.push('Content-Transfer-Encoding: base64');
      message.push(`Content-Disposition: attachment; filename="${attachment.fileName}"`);
      message.push('');
      message.push(attachment.base64);
      message.push('');
    });
    
    message.push(`--${boundary}--`);
  } else {
    // Email without attachment
    message.push('Content-Type: text/plain; charset="UTF-8"');
    message.push('');
    message.push(body);
  }

  // Encode to base64url (Gmail API requirement)
  const emailString = message.join('\r\n');
  const base64Email = btoa(unescape(encodeURIComponent(emailString)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return base64Email;
};

