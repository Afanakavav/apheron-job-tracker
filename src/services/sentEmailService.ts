/**
 * Sent Email Service
 * Manages sent emails in Firestore
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SentEmail } from '../types';

const SENT_EMAILS_COLLECTION = 'sent_emails';

// Convert Firebase Timestamps to Date
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

/**
 * Save a sent email to Firestore
 */
export const saveSentEmail = async (
  userId: string,
  to: string,
  subject: string,
  body: string,
  attachmentNames: string[],
  emailType?: 'application' | 'confirmation' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined',
  applicationId?: string
): Promise<string> => {
  try {
    console.log('💾 [SentEmail] Preparing to save email...', {
      userId,
      to,
      subjectLength: subject.length,
      bodyLength: body.length,
      attachmentsCount: attachmentNames.length,
      emailType,
      applicationId,
    });

    const emailData = {
      userId,
      applicationId: applicationId || null,
      to,
      subject,
      body,
      attachmentNames,
      emailType: emailType || null,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    console.log('💾 [SentEmail] Adding document to Firestore collection:', SENT_EMAILS_COLLECTION);
    const docRef = await addDoc(collection(db, SENT_EMAILS_COLLECTION), emailData);
    console.log('✅ [SentEmail] Email saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('❌ [SentEmail] Error saving email:', error);
    console.error('❌ [SentEmail] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name,
    });
    throw error;
  }
};

/**
 * Get all sent emails for a user
 */
export const getSentEmails = async (userId: string): Promise<SentEmail[]> => {
  try {
    // Try with orderBy first (requires index)
    try {
      const q = query(
        collection(db, SENT_EMAILS_COLLECTION),
        where('userId', '==', userId),
        orderBy('sentAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const emails: SentEmail[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = convertTimestamps(doc.data());
        emails.push({
          id: doc.id,
          ...data,
        } as SentEmail);
      });
      
      return emails;
    } catch (orderByError: any) {
      // If orderBy fails (index not ready), fallback to sort in memory
      if (orderByError instanceof Error && orderByError.message.includes('index')) {
        console.warn('⚠️ [SentEmail] Firestore index not ready, using fallback sorting');
        const qFallback = query(
          collection(db, SENT_EMAILS_COLLECTION),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(qFallback);
        const emails: SentEmail[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = convertTimestamps(doc.data());
          emails.push({
            id: doc.id,
            ...data,
          } as SentEmail);
        });
        
        // Sort in memory
        emails.sort((a, b) => {
          const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
          const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
          return dateB - dateA;
        });
        
        return emails;
      }
      throw orderByError;
    }
  } catch (error) {
    console.error('❌ [SentEmail] Error fetching emails:', error);
    throw error;
  }
};

/**
 * Get sent emails for a specific application
 */
export const getSentEmailsByApplication = async (
  userId: string,
  applicationId: string
): Promise<SentEmail[]> => {
  try {
    const q = query(
      collection(db, SENT_EMAILS_COLLECTION),
      where('userId', '==', userId),
      where('applicationId', '==', applicationId),
      orderBy('sentAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const emails: SentEmail[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      emails.push({
        id: doc.id,
        ...data,
      } as SentEmail);
    });
    
    return emails;
  } catch (error) {
    console.error('❌ [SentEmail] Error fetching emails by application:', error);
    // Fallback: if index not ready, filter in memory
    if (error instanceof Error && error.message.includes('index')) {
      const qFallback = query(
        collection(db, SENT_EMAILS_COLLECTION),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(qFallback);
      const emails: SentEmail[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = convertTimestamps(doc.data());
        if (data.applicationId === applicationId) {
          emails.push({
            id: doc.id,
            ...data,
          } as SentEmail);
        }
      });
      
      // Sort in memory
      emails.sort((a, b) => {
        const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return dateB - dateA;
      });
      
      return emails;
    }
    throw error;
  }
};

/**
 * Delete a sent email
 */
export const deleteSentEmail = async (emailId: string, userId: string): Promise<void> => {
  try {
    // Verify ownership
    const emailRef = doc(db, SENT_EMAILS_COLLECTION, emailId);
    const emailSnap = await getDoc(emailRef);
    
    if (!emailSnap.exists()) {
      throw new Error('Email non trovata');
    }
    
    const emailData = emailSnap.data();
    if (emailData.userId !== userId) {
      throw new Error('Non autorizzato a eliminare questa email');
    }
    
    await deleteDoc(emailRef);
    console.log('✅ [SentEmail] Email deleted:', emailId);
  } catch (error) {
    console.error('❌ [SentEmail] Error deleting email:', error);
    throw error;
  }
};

/**
 * Delete all sent emails for a specific application
 * Uses a simple query without orderBy to avoid Firestore index requirements
 */
export const deleteSentEmailsByApplication = async (
  applicationId: string,
  userId: string
): Promise<number> => {
  try {
    console.log('🗑️ [SentEmail] Deleting emails for application:', applicationId);
    
    // Query without orderBy to avoid index requirement
    const q = query(
      collection(db, SENT_EMAILS_COLLECTION),
      where('userId', '==', userId),
      where('applicationId', '==', applicationId)
    );
    
    const querySnapshot = await getDocs(q);
    let deletedCount = 0;
    
    // Delete each email document
    for (const emailDoc of querySnapshot.docs) {
      try {
        await deleteDoc(emailDoc.ref);
        deletedCount++;
        console.log(`✅ [SentEmail] Deleted email ${emailDoc.id}`);
      } catch (error) {
        console.error(`❌ [SentEmail] Error deleting email ${emailDoc.id}:`, error);
      }
    }
    
    console.log(`✅ [SentEmail] Deleted ${deletedCount} emails for application ${applicationId}`);
    return deletedCount;
  } catch (error) {
    console.error('❌ [SentEmail] Error deleting emails by application:', error);
    // Don't throw - return 0 if error occurs (e.g., index not ready)
    return 0;
  }
};

